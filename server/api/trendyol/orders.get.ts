/**
 * GET /api/trendyol/orders
 * Server-side proxy for Trendyol Orders API.
 * Fetches store credentials from Supabase (user-scoped via RLS),
 * then calls Trendyol API — credentials never exposed to the client.
 */

import { serverSupabaseClient } from '#supabase/server'

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
    .select('seller_id, api_key, api_secret, marketplace, store_name')
    .eq('id', storeId)
    .single()

  if (storeError || !store) {
    throw createError({ statusCode: 404, statusMessage: 'Mağaza bulunamadı' })
  }

  if (store.marketplace !== 'trendyol') {
    throw createError({ statusCode: 400, statusMessage: 'Desteklenmeyen pazaryeri' })
  }

  if (!store.api_key || !store.api_secret || !store.seller_id) {
    throw createError({ statusCode: 422, statusMessage: 'Mağaza API bilgileri eksik' })
  }

  // ─── Build Trendyol request ───────────────────────────────────────────────
  const credentials = Buffer
    .from(`${store.api_key}:${store.api_secret}`)
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

  // ─── Call Trendyol API ────────────────────────────────────────────────────
  try {
    const url = `${TRENDYOL_BASE}/${store.seller_id}/orders`
    console.log('[Trendyol Proxy] Request:', {
      url,
      params: trendyolParams,
      authHeader: `Basic ${credentials.substring(0, 10)}...`
    })

    const data = await $fetch(
      url,
      {
        headers: {
          Authorization:  `Basic ${credentials}`,
          'User-Agent':   `${store.seller_id} - SelfIntegration`,
          'Content-Type': 'application/json',
        },
        params: trendyolParams,
      },
    )

    console.log('[Trendyol Proxy] Success Response:', {
      totalElements: (data as any)?.totalElements,
      totalPages: (data as any)?.totalPages,
      contentCount: (data as any)?.content?.length,
      rawKeys: Object.keys(data as any)
    })

    return data
  }
  catch (err: unknown) {
    const e = err as { statusCode?: number; statusMessage?: string; message?: string; data?: any }
    console.error('[Trendyol Proxy] Error Response:', {
      statusCode: e.statusCode,
      statusMessage: e.statusMessage,
      message: e.message,
      responseData: e.data
    })
    throw createError({
      statusCode:    e.statusCode    || 502,
      statusMessage: e.statusMessage || e.message || 'Trendyol API erişim hatası',
    })
  }
})
