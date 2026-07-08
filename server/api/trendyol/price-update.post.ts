/**
 * POST /api/trendyol/price-update
 * Sends real-time price updates (single or bulk) to the Trendyol V2 inventory gateway
 * (https://apigw.trendyol.com/integration/inventory/sellers/{sellerId}/products/price-and-inventory)
 */

import { serverSupabaseClient } from '#supabase/server'

const TRENDYOL_INVENTORY_BASE = 'https://apigw.trendyol.com/integration/inventory/sellers'

export default defineEventHandler(async (event) => {
  // ─── Auth via Supabase (RLS checked automatically) ────────────────────────
  const client = await serverSupabaseClient(event)

  const { data: { user }, error: authError } = await client.auth.getUser()
  if (authError || !user) {
    throw createError({ statusCode: 401, statusMessage: 'Yetkisiz erişim' })
  }

  // ─── Request Body validation with fallback for H3 v2 ─────────────────────────
  let body: any
  try {
    body = await readBody(event)
  } catch (err: any) {
    console.warn('[Price Update Proxy] readBody failed, trying raw stream parser:', err.message)
    body = await new Promise((resolve, reject) => {
      const req = event.node?.req || (event as any).req
      if (!req) return resolve({})
      if (req.body) return resolve(req.body)
      let data = ''
      req.on('data', (chunk: any) => { data += chunk })
      req.on('end', () => {
        try {
          resolve(data ? JSON.parse(data) : {})
        } catch (e) {
          resolve({})
        }
      })
      req.on('error', (e: any) => { reject(e) })
    })
  }
  const { storeId, items, updateType } = (body || {}) as {
    storeId: string
    updateType?: 'bulk' | 'single' | 'group'
    items: Array<{
      barcode: string
      quantity?: number
      salePrice: number
      listPrice: number
    }>
  }

  // ─── Rate Limiting (Max 10 requests per minute) ──────────────────────────
  const now = new Date()
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000)

  const { count: requestCount, error: rateError } = await client
    .from('request_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('endpoint', '/api/trendyol/price-update')
    .gte('created_at', oneMinuteAgo.toISOString())

  if (rateError) {
    console.error('[Rate Limit] DB query failed:', rateError.message)
  } else if (requestCount !== null && requestCount >= 10) {
    throw createError({ statusCode: 429, statusMessage: 'Çok fazla fiyat güncelleme isteği gönderdiniz. Lütfen bir dakika bekleyin.' })
  }

  // Log this request
  client.from('request_logs').insert({
    user_id: user.id,
    endpoint: '/api/trendyol/price-update'
  }).then(({ error }) => {
    if (error) console.error('[Rate Limit] Log insert failed:', error.message)
  })

  // Cleanup old logs asynchronously
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  client.from('request_logs').delete().lt('created_at', oneHourAgo.toISOString()).then(({ error }) => {
    if (error) console.error('[Rate Limit Cleanup] Failed:', error.message)
  })

  // ─── Input Validation ─────────────────────────────────────────────────────
  if (!storeId || typeof storeId !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Geçersiz veya eksik storeId.' })
  }
  if (updateType !== undefined && !['single', 'bulk', 'group'].includes(updateType)) {
    throw createError({ statusCode: 400, statusMessage: 'Geçersiz updateType.' })
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Eksik veya boş items listesi.' })
  }
  if (items.length > 200) {
    throw createError({ statusCode: 400, statusMessage: 'Tek seferde en fazla 200 ürün güncellenebilir.' })
  }

  for (const item of items) {
    if (!item.barcode || typeof item.barcode !== 'string') {
      throw createError({ statusCode: 400, statusMessage: 'Her ürün için geçerli bir barkod gereklidir.' })
    }
    if (item.salePrice === undefined || typeof item.salePrice !== 'number' || item.salePrice <= 0 || item.salePrice > 1000000) {
      throw createError({ statusCode: 400, statusMessage: `Barkod ${item.barcode} için geçersiz satış fiyatı (0-1.000.000 limitleri arasındadır).` })
    }
    if (item.listPrice === undefined || typeof item.listPrice !== 'number' || item.listPrice <= 0 || item.listPrice > 1000000) {
      throw createError({ statusCode: 400, statusMessage: `Barkod ${item.barcode} için geçersiz liste fiyatı (0-1.000.000 limitleri arasındadır).` })
    }
    if (item.listPrice < item.salePrice) {
      throw createError({ statusCode: 400, statusMessage: `Barkod ${item.barcode} için liste fiyatı satış fiyatından küçük olamaz.` })
    }
    if (item.quantity === undefined || !Number.isInteger(item.quantity) || item.quantity < 0 || item.quantity > 100000) {
      throw createError({ statusCode: 400, statusMessage: `Barkod ${item.barcode} için stok adedi (quantity) geçersiz (0-100.000 aralığında olmalıdır).` })
    }
  }

  // ─── Determine Cost & Verify Credits Early ────────────────────────────────
  const costs: Record<string, number> = {
    bulk: 30,
    single: 0.5,
    group: 10
  }
  const activeType = updateType || (items.length === 1 ? 'single' : 'bulk')
  const cost = costs[activeType] || 30

  // Check current credits before making external calls
  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('credits')
    .single()

  if (profileError || !profile) {
    throw createError({ statusCode: 404, statusMessage: 'Kullanıcı profili bulunamadı.' })
  }

  if (profile.credits < cost) {
    throw createError({ statusCode: 402, statusMessage: 'Yetersiz kredi bakiyesi. İşlem gerçekleştirilemedi.' })
  }

  // ─── Fetch store info (RLS) ───────────────────────────────────────────────
  const { data: store, error: storeError } = await client
    .from('stores')
    .select('seller_id, marketplace')
    .eq('id', storeId)
    .single()

  if (storeError || !store) {
    throw createError({ statusCode: 404, statusMessage: 'Mağaza bulunamadı' })
  }

  // ─── Fetch decrypted credentials securely from Vault RPC ─────────────────
  const { data: creds, error: credsError } = await client
    .rpc('get_store_credentials', { p_store_id: storeId })
    .single()

  if (credsError || !creds || !creds.api_key || !creds.api_secret || !store.seller_id) {
    throw createError({ statusCode: 422, statusMessage: 'Mağaza API kimlik bilgileri eksik veya yetkisiz.' })
  }

  // ─── Build Trendyol Credentials ───────────────────────────────────────────
  const credentials = Buffer
    .from(`${creds.api_key}:${creds.api_secret}`)
    .toString('base64')

  const url = `${TRENDYOL_INVENTORY_BASE}/${store.seller_id}/products/price-and-inventory`

  // ─── Call Trendyol API ────────────────────────────────────────────────────
  try {
    console.log('[Price Update Proxy] Sending payload to Trendyol...', {
      itemCount: items.length
    })

    const response = await $fetch<any>(
      url,
      {
        method: 'POST',
        headers: {
          Authorization:  `Basic ${credentials}`,
          'User-Agent':   `${store.seller_id} - SelfIntegration`,
          'Content-Type': 'application/json',
        },
        body: {
          items: items.map(item => ({
            barcode: item.barcode,
            quantity: item.quantity,
            salePrice: Number(item.salePrice),
            listPrice: Number(item.listPrice)
          }))
        }
      }
    )

    console.log('[Price Update Proxy] Success response received from Trendyol.')

    // Deduct credits only after successful call
    const { data: hasCredits, error: spendError } = await client.rpc('spend_credits', { cost })
    if (spendError || !hasCredits) {
      throw createError({ statusCode: 402, statusMessage: 'İşlem tamamlandı ancak kredi bakiyesi güncellenemedi.' })
    }

    return {
      success: true,
      batchRequestId: response.batchRequestId || 'mock-batch-id',
      updatedCount: items.length
    }
  }
  catch (err: unknown) {
    const e = err as { statusCode?: number; statusMessage?: string; message?: string }
    console.error('[Price Update Proxy] Trendyol Update API Error:', {
      statusCode: e.statusCode,
      statusMessage: e.statusMessage,
      message: e.message
    })

    throw createError({
      statusCode: e.statusCode || 502,
      statusMessage: e.statusMessage || e.message || 'Trendyol fiyat güncellemesi başarısız oldu.',
    })
  }
})
