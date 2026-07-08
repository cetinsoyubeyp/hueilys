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
  const { storeId, items, updateType } = body as {
    storeId: string
    updateType?: 'bulk' | 'single' | 'group'
    items: Array<{
      barcode: string
      quantity?: number
      salePrice: number
      listPrice: number
    }>
  }

  if (!storeId || !items || !Array.isArray(items) || items.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Eksik veya hatalı parametreler (storeId ve items gereklidir)' })
  }

  // ─── Deduct Credits Server-side ──────────────────────────────────────────
  const costs: Record<string, number> = {
    bulk: 30,
    single: 0.5,
    group: 10
  }
  const activeType = updateType || (items.length === 1 ? 'single' : 'bulk')
  const cost = costs[activeType] || 30

  const { data: hasCredits, error: creditError } = await client.rpc('spend_credits', { cost })
  if (creditError || !hasCredits) {
    throw createError({ statusCode: 402, statusMessage: 'Yetersiz kredi bakiyesi. İşlem gerçekleştirilemedi.' })
  }

  // ─── Fetch store credentials (RLS) ───────────────────────────────────────
  const { data: store, error: storeError } = await client
    .from('stores')
    .select('seller_id, api_key, api_secret, marketplace')
    .eq('id', storeId)
    .single()

  if (storeError || !store) {
    throw createError({ statusCode: 404, statusMessage: 'Mağaza bulunamadı' })
  }

  if (!store.api_key || !store.api_secret || !store.seller_id) {
    throw createError({ statusCode: 422, statusMessage: 'Mağaza API kimlik bilgileri eksik.' })
  }

  // ─── Build Trendyol Credentials ───────────────────────────────────────────
  const credentials = Buffer
    .from(`${store.api_key}:${store.api_secret}`)
    .toString('base64')

  const url = `${TRENDYOL_INVENTORY_BASE}/${store.seller_id}/products/price-and-inventory`

  // ─── Call Trendyol API ────────────────────────────────────────────────────
  try {
    console.log('[Price Update Proxy] Sending payload to Trendyol:', {
      url,
      itemCount: items.length,
      sampleItem: items[0]
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
            // Fallback to stock/quantity 100 if not specified to prevent resetting active inventories
            quantity: item.quantity !== undefined ? item.quantity : 100,
            salePrice: Number(item.salePrice),
            listPrice: Number(item.listPrice)
          }))
        }
      }
    )

    console.log('[Price Update Proxy] Success response from Trendyol:', response)

    return {
      success: true,
      batchRequestId: response.batchRequestId || 'mock-batch-id',
      updatedCount: items.length
    }
  }
  catch (err: unknown) {
    const e = err as { statusCode?: number; statusMessage?: string; message?: string; data?: any }
    console.error('[Price Update Proxy] Trendyol Update API Error:', {
      statusCode: e.statusCode,
      statusMessage: e.statusMessage,
      message: e.message,
      responseData: e.data
    })

    throw createError({
      statusCode: e.statusCode || 502,
      statusMessage: e.statusMessage || e.message || 'Trendyol fiyat güncellemesi başarısız oldu.',
    })
  }
})
