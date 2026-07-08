/**
 * GET /api/trendyol/products
 * Server-side proxy for Trendyol Products V2 API.
 * Fetches up to 2,000 products by executing concurrent parallel requests (Promise.all)
 * on the server-side, ensuring extremely fast responses without hitting serverless timeouts.
 */

import { serverSupabaseClient } from '#supabase/server'

const TRENDYOL_V2_BASE = 'https://apigw.trendyol.com/integration/product/sellers'

// Simple in-memory cache for products (TTL: 30 seconds)
const productsCache = new Map<string, { data: any; expiry: number }>()
const CACHE_TTL_MS = 30 * 1000

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

  // ─── 0. Check in-memory cache ─────────────────────────────────────────────
  const cached = productsCache.get(storeId)
  if (cached && cached.expiry > Date.now()) {
    console.log(`[Products Proxy V2] Returning cached catalog for store ${storeId}`)
    return cached.data
  }

  // Disable caching to ensure fresh product pricing calculations
  if (event.node?.res) {
    event.node.res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    event.node.res.setHeader('Pragma', 'no-cache')
    event.node.res.setHeader('Expires', '0')
  }

  // ─── Fetch store credentials (RLS) ───────────────────────────────────────
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

  // ─── Build Trendyol request ───────────────────────────────────────────────
  const credentials = Buffer
    .from(`${creds.api_key}:${creds.api_secret}`)
    .toString('base64')

  const pageSize = 100 // Fetch max elements per page
  const allProducts: any[] = []
  let totalElements = 0

  // ─── Call Trendyol Product V2 API in Parallel to Fetch All Products ───────
  try {
    const url = `${TRENDYOL_V2_BASE}/${store.seller_id}/products`
    console.log('[Products Proxy V2] Initiating parallel catalog fetch from Trendyol...')

    // 1. Fetch Page 0 first to determine the total number of products
    const firstPage: any = await $fetch(
      url,
      {
        headers: {
          Authorization:  `Basic ${credentials}`,
          'User-Agent':   `${store.seller_id} - SelfIntegration`,
          'Content-Type': 'application/json',
        },
        params: {
          page: 0,
          size: pageSize
        },
      },
    )

    if (firstPage && firstPage.content) {
      allProducts.push(...firstPage.content)
      totalElements = firstPage.totalElements || 0
    }

    // 2. Queue remaining pages concurrently in parallel (up to 2,000 products / 20 pages max)
    const maxPages = Math.min(Math.ceil(totalElements / pageSize), 20)
    const fetchPromises = []
    
    for (let pageIndex = 1; pageIndex < maxPages; pageIndex++) {
      console.log(`[Products Proxy V2] Queueing parallel request for page ${pageIndex} of ${maxPages}...`)
      fetchPromises.push(
        $fetch<any>(
          url,
          {
            headers: {
              Authorization:  `Basic ${credentials}`,
              'User-Agent':   `${store.seller_id} - SelfIntegration`,
              'Content-Type': 'application/json',
            },
            params: {
              page: pageIndex,
              size: pageSize
            },
          }
        )
      )
    }

    // 3. Resolve all promises concurrently with allSettled to prevent single-page failures from failing the whole request
    if (fetchPromises.length > 0) {
      const results = await Promise.allSettled(fetchPromises)
      results.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          const res = result.value
          if (res && res.content) {
            allProducts.push(...res.content)
          }
        } else {
          console.error(`[Products Proxy V2] Page fetch failed for queue item ${idx + 1}:`, result.reason)
        }
      })
    }

    console.log('[Products Proxy V2] Parallel Fetch completed. Total aggregated products:', allProducts.length)

    const resultPayload = {
      content: allProducts,
      totalElements: allProducts.length
    }

    // Cache the result
    productsCache.set(storeId, {
      data: resultPayload,
      expiry: Date.now() + CACHE_TTL_MS
    })

    return resultPayload
  }
  catch (err: unknown) {
    const e = err as { statusCode?: number; statusMessage?: string; message?: string }
    console.error('[Products Proxy V2] Failed to fetch parallel catalog:', {
      statusCode: e.statusCode,
      statusMessage: e.statusMessage,
      message: e.message,
    })
    
    throw createError({
      statusCode: e.statusCode || 502,
      statusMessage: e.statusMessage || e.message || 'Trendyol canlı ürün verileri paralel olarak çekilemedi.',
    })
  }
})
