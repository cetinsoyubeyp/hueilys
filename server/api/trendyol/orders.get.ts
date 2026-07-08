/**
 * GET /api/trendyol/orders
 * Server-side proxy for Trendyol Orders API.
 * Fetches store credentials from Supabase (user-scoped via RLS),
 * then calls Trendyol API — credentials never exposed to the client.
 */

import { serverSupabaseClient } from '#supabase/server'
import fs from 'fs'

const TRENDYOL_BASE = 'https://api.trendyol.com/sapigw/suppliers'

export default defineEventHandler(async (event) => {
  // ─── Auth via Supabase (RLS applied automatically) ────────────────────────
  const client = await serverSupabaseClient(event)

  const { data: { user }, error: authError } = await client.auth.getUser()
  if (authError || !user) {
    throw createError({ statusCode: 401, statusMessage: 'Yetkisiz erişim' })
  }

  // ─── Query params ─────────────────────────────────────────────────────────
  const query = getQuery(event)
  const storeId = query.storeId as string | undefined

  if (!storeId) {
    throw createError({ statusCode: 400, statusMessage: 'storeId parametresi gerekli' })
  }

  // Tarayıcı önbelleklemesini tamamen kapat (Verinin hep güncel kalması için)
  // h3 setHeader bug'ını aşmak için doğrudan yerel Node.js response nesnesini kullanıyoruz
  if (event.node?.res) {
    event.node.res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    event.node.res.setHeader('Pragma', 'no-cache')
    event.node.res.setHeader('Expires', '0')
  }

  // ─── Fetch store credentials (RLS: only own stores) ───────────────────────
  const { data: store, error: storeError } = await client
    .from('stores')
    .select('seller_id, marketplace, store_name')
    .eq('id', storeId)
    .single()

  if (storeError || !store) {
    throw createError({ statusCode: 404, statusMessage: 'Mağaza bulunamadı' })
  }

  if (store.marketplace !== 'trendyol') {
    throw createError({ statusCode: 400, statusMessage: 'Desteklenmeyen pazaryeri' })
  }

  // ─── Fetch decrypted credentials securely from Vault RPC ─────────────────
  const { data: creds, error: credsError } = await client
    .rpc('get_store_credentials', { p_store_id: storeId })
    .single()

  if (credsError || !creds || !creds.api_key || !creds.api_secret || !store.seller_id) {
    throw createError({ statusCode: 422, statusMessage: 'Mağaza API bilgileri eksik veya yetkisiz' })
  }

  // ─── Build Trendyol request ───────────────────────────────────────────────
  const credentials = Buffer
    .from(`${creds.api_key}:${creds.api_secret}`)
    .toString('base64')

  // ─── Enforce 14-day max window (server-side safety net) ─────────────────────
  const MAX_DAYS    = 14
  const MAX_MS      = MAX_DAYS * 24 * 60 * 60 * 1000
  const now         = Date.now()
  const maxStart    = now - MAX_MS

  // Default: last 14 days if no startDate given
  const rawStart    = query.startDate ? Number(query.startDate) : maxStart
  // Clamp: never allow data older than MAX_DAYS
  const clampedStart = Math.max(rawStart, maxStart)
  if (rawStart < maxStart) {
    console.warn(`[Trendyol Proxy] startDate was older than ${MAX_DAYS} days — clamped to ${new Date(clampedStart).toISOString()}`)
  }

  const trendyolParams: Record<string, string | number> = {
    page:             Number(query.page) || 0,
    size:             Number(query.size) || 20,
    orderByField:     'CreatedDate',
    orderByDirection: 'DESC',
    startDate:        clampedStart,
    endDate:          query.endDate ? Number(query.endDate) : now,
  }

  if (query.status && query.status !== 'all')
    trendyolParams.status = String(query.status)
  if (query.orderNumber)
    trendyolParams.orderNumber = String(query.orderNumber)

  // Log request to debug log file
  try {
    const logPath = 'c:/Users/Çetin/Desktop/Hueilys/debug_orders.log'
    const logMsg = `[${new Date().toISOString()}] REQUEST query.startDate=${query.startDate} query.endDate=${query.endDate} clampedStart=${clampedStart} params=${JSON.stringify(trendyolParams)}\n`
    fs.appendFileSync(logPath, logMsg)
  } catch (e) {}

  // ─── Call Trendyol API (Aggregated Fetch for All Pages) ────────────────────
  try {
    const url = `${TRENDYOL_BASE}/${store.seller_id}/orders`
    const pageSize = 200
    
    // First request: Page 0, Size 200
    const firstParams = {
      ...trendyolParams,
      page: 0,
      size: pageSize,
    }

    console.log('[Trendyol Proxy] Fetching page 0...', { url, params: firstParams })

    const firstPage: any = await $fetch(
      url,
      {
        headers: {
          Authorization:  `Basic ${credentials}`,
          'User-Agent':   `${store.seller_id} - SelfIntegration`,
          'Content-Type': 'application/json',
        },
        params: firstParams,
      },
    )

    const allOrders = [...(firstPage?.content || [])]
    const totalElements = firstPage?.totalElements || 0
    const maxPages = Math.min(Math.ceil(totalElements / pageSize), 20)

    console.log('[Trendyol Proxy] Page 0 loaded:', {
      totalElements,
      maxPages,
      contentCount: firstPage?.content?.length
    })

    if (maxPages > 1) {
      const fetchPromises = []
      for (let pageIndex = 1; pageIndex < maxPages; pageIndex++) {
        const pageParams = {
          ...trendyolParams,
          page: pageIndex,
          size: pageSize,
        }
        fetchPromises.push(
          $fetch<any>(
            url,
            {
              headers: {
                Authorization:  `Basic ${credentials}`,
                'User-Agent':   `${store.seller_id} - SelfIntegration`,
                'Content-Type': 'application/json',
              },
              params: pageParams,
            }
          )
        )
      }

      const results = await Promise.allSettled(fetchPromises)
      results.forEach((res, index) => {
        if (res.status === 'fulfilled' && res.value?.content) {
          allOrders.push(...res.value.content)
        } else {
          console.error(`[Trendyol Proxy] Failed to fetch page ${index + 1}:`, res.status === 'rejected' ? res.reason : 'No content')
        }
      })
    }

    // Sort aggregated orders by orderDate desc
    allOrders.sort((a, b) => b.orderDate - a.orderDate)

    const result = {
      content: allOrders,
      totalElements: allOrders.length,
      totalPages: 1,
      page: 0,
      size: allOrders.length,
    }

    console.log('[Trendyol Proxy] Success Response (Aggregated):', {
      totalElements: result.totalElements,
      contentCount: result.content.length
    })

    // Log response to debug log file
    try {
      const logPath = 'c:/Users/Çetin/Desktop/Hueilys/debug_orders.log'
      const logMsg = `[${new Date().toISOString()}] RESPONSE count=${result.content.length} totalElements=${result.totalElements} firstOrderDate=${result.content[0]?.orderDate}\n`
      fs.appendFileSync(logPath, logMsg)
    } catch (e) {}

    return result
  }
  catch (err: unknown) {
    const e = err as { statusCode?: number; statusMessage?: string; message?: string; data?: any }
    console.error('[Trendyol Proxy] Error Response:', {
      statusCode: e.statusCode,
      statusMessage: e.statusMessage,
      message: e.message,
      responseData: e.data
    })
    // Log error to debug log file
    try {
      const logPath = 'c:/Users/Çetin/Desktop/Hueilys/debug_orders.log'
      const logMsg = `[${new Date().toISOString()}] ERROR status=${e.statusCode} msg=${e.statusMessage || e.message} data=${JSON.stringify(e.data)}\n`
      fs.appendFileSync(logPath, logMsg)
    } catch (ex) {}
    throw createError({
      statusCode:    e.statusCode    || 502,
      statusMessage: e.statusMessage || e.message || 'Trendyol API erişim hatası',
    })
  }
})
