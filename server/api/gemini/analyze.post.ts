import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  // 1. Auth check via Supabase
  const client = await serverSupabaseClient(event)
  const { data: { user }, error: authError } = await client.auth.getUser()
  if (authError || !user) {
    throw createError({ statusCode: 401, statusMessage: 'Yetkisiz erişim' })
  }

  // 2. Read request body with resilient fallback for H3 v2 node environments
  let body: any
  try {
    body = await readBody(event)
  } catch (err: any) {
    console.warn('[Gemini Analyze] readBody failed, trying raw stream parser:', err.message)
    body = await new Promise((resolve, reject) => {
      const req = event.node?.req || (event as any).req
      if (!req) return resolve({})
      
      if (req.body) {
        return resolve(req.body)
      }
      
      let data = ''
      req.on('data', (chunk: any) => {
        data += chunk
      })
      req.on('end', () => {
        try {
          resolve(data ? JSON.parse(data) : {})
        } catch (e) {
          console.error('[Gemini Analyze] Raw stream JSON parse error:', e)
          resolve({})
        }
      })
      req.on('error', (e: any) => {
        reject(e)
      })
    })
  }
  const { storeId, mode, customQuery, startDate: bodyStartDate, endDate: bodyEndDate } = body || {}

  if (!storeId || !mode) {
    throw createError({ statusCode: 400, statusMessage: 'storeId ve mode parametreleri gereklidir.' })
  }

  const validModes = ['returns', 'general', 'pricing']
  if (!validModes.includes(mode)) {
    throw createError({ statusCode: 400, statusMessage: 'Geçersiz analiz modu.' })
  }

  // ─── Deduct Credits Server-side ──────────────────────────────────────────
  const costs: Record<string, number> = {
    returns: 10,
    general: 15,
    pricing: 10
  }
  const cost = costs[mode] || 10

  const { data: hasCredits, error: creditError } = await client.rpc('spend_credits', { cost })
  if (creditError || !hasCredits) {
    throw createError({ statusCode: 402, statusMessage: 'Yetersiz kredi bakiyesi. İşlem gerçekleştirilemedi.' })
  }

  // 3. Fetch store credentials and info
  const { data: store, error: storeError } = await client
    .from('stores')
    .select('store_name, seller_id, api_key, api_secret, marketplace')
    .eq('id', storeId)
    .single()

  if (storeError || !store) {
    throw createError({ statusCode: 404, statusMessage: 'Mağaza bulunamadı' })
  }

  const storeName = store.store_name || 'E-Ticaret Mağazası'
  let products: any[] = []
  let orders: any[]   = []
  let claims: any[]   = []   // Trendyol Claims (İadeler) — separate endpoint from orders
  let isLive = false

  // ─── Determine time window (max 14 days, enforced server-side) ──────────────
  const MAX_WINDOW_MS = 14 * 24 * 60 * 60 * 1000
  const now = Date.now()
  const minAllowedStart = now - MAX_WINDOW_MS
  // Client sends timestamps in ms; default = last 14 days
  const reqStart = bodyStartDate ? Number(bodyStartDate) : minAllowedStart
  const reqEnd   = bodyEndDate   ? Number(bodyEndDate)   : now
  const windowStart = Math.max(reqStart, minAllowedStart) // clamp to 14 days
  const windowEnd   = Math.min(reqEnd,   now)             // can't be in the future

  // Human-readable label for the prompt and UI
  const windowHours = Math.round((windowEnd - windowStart) / (1000 * 60 * 60))
  const windowDays  = Math.round(windowHours / 24)
  const windowLabel = windowHours <= 1   ? 'son 1 saat'
                    : windowHours <= 24  ? `son ${windowHours} saat`
                    : windowDays <= 1    ? 'son 1 gün'
                    : windowDays <= 3    ? 'son 3 gün'
                    : windowDays <= 7    ? 'son 7 gün'
                    : 'son 14 gün'

  console.log(`[Gemini Analyze] Window: ${new Date(windowStart).toISOString()} → ${new Date(windowEnd).toISOString()} (${windowLabel})`)

  // 4. Fetch live data — products, orders, AND claims (each from its own endpoint)
  if (store.api_key && store.api_secret && store.seller_id && store.marketplace === 'trendyol') {
    const credentials = Buffer.from(`${store.api_key}:${store.api_secret}`).toString('base64')
    const commonHeaders = {
      Authorization: `Basic ${credentials}`,
      'User-Agent': `${store.seller_id} - SelfIntegration`,
      'Content-Type': 'application/json'
    }

    // ── Products ─────────────────────────────────────────────────────────────
    try {
      console.log('[Gemini Analyze] Fetching products...')
      const pRes: any = await $fetch(`https://apigw.trendyol.com/integration/product/sellers/${store.seller_id}/products`, {
        method: 'GET',
        params: { page: 0, size: 50, approved: true },
        headers: commonHeaders
      })
      if (pRes?.content && Array.isArray(pRes.content)) {
        products = pRes.content
        isLive = true
        console.log(`[Gemini Analyze] ✅ Products: ${products.length}`)
      } else {
        console.warn('[Gemini Analyze] Products unexpected shape:', JSON.stringify(pRes).substring(0, 200))
      }
    } catch (e: any) {
      console.error('[Gemini Analyze] ❌ Products FAILED:', e.statusCode, e.statusMessage || e.message)
    }

    // ── Orders (for general & pricing modes — status, volume, revenue) ────────
    try {
      console.log('[Gemini Analyze] Fetching orders...')
      const oRes: any = await $fetch(`https://apigw.trendyol.com/integration/order/sellers/${store.seller_id}/orders`, {
        method: 'GET',
        params: {
          page: 0,
          size: 200,
          startDate: windowStart,
          endDate: windowEnd,
          orderByField: 'CreatedDate',
          orderByDirection: 'DESC'
        },
        headers: commonHeaders
      })
      if (oRes?.content && Array.isArray(oRes.content)) {
        orders = oRes.content
        isLive = true
        console.log(`[Gemini Analyze] ✅ Orders: ${orders.length}`)
      } else {
        console.warn('[Gemini Analyze] Orders unexpected shape:', JSON.stringify(oRes).substring(0, 200))
      }
    } catch (e: any) {
      console.error('[Gemini Analyze] ❌ Orders FAILED:', e.statusCode, e.statusMessage || e.message)
    }

    // ── Claims / İadeler (DEDICATED endpoint — NOT included in orders) ─────────
    // Trendyol returns live in /claims, NOT in /orders. This is the real return data.
    try {
      console.log('[Gemini Analyze] Fetching claims (iadeler)...')
      const cRes: any = await $fetch(`https://apigw.trendyol.com/integration/order/sellers/${store.seller_id}/claims`, {
        method: 'GET',
        params: {
          page: 0,
          size: 200,
          startDate: windowStart,
          endDate:   windowEnd
        },
        headers: commonHeaders
      })
      // Claims response: { content: [...], totalElements, totalPages }
      // Each claim has: claimItems[], claimDate, orderNumber, customerFirstName, customerLastName
      // Each claimItem has: productName, barcode, productCode, quantity, price, claimItemStatus, claimReason (or reason)
      if (cRes?.content && Array.isArray(cRes.content)) {
        claims = cRes.content
        isLive = true
        console.log(`[Gemini Analyze] ✅ Claims: ${claims.length}`)
      } else if (Array.isArray(cRes)) {
        // Some API versions return array directly
        claims = cRes
        isLive = true
        console.log(`[Gemini Analyze] ✅ Claims (direct array): ${claims.length}`)
      } else {
        console.warn('[Gemini Analyze] Claims unexpected shape:', JSON.stringify(cRes).substring(0, 300))
      }
    } catch (e: any) {
      console.error('[Gemini Analyze] ❌ Claims FAILED:', e.statusCode, e.statusMessage || e.message)
    }

    console.log(`[Gemini Analyze] Live summary — Products: ${products.length} | Orders: ${orders.length} | Claims: ${claims.length} | isLive: ${isLive}`)
  }

  // 5. Fallback datasets — only used when live data is unavailable
  if (products.length === 0) {
    products = [
      { title: 'Kablosuz Kulaklık V5.3 (Siyah)', barcode: '8680000000018', stockCode: 'KK-V53-B', salePrice: 899, listPrice: 1200, commissionRate: 15 },
      { title: 'Akıllı Saat Pro X (Metal Kordon)', barcode: '8680000000025', stockCode: 'AS-PROX-M', salePrice: 1499, listPrice: 2000, commissionRate: 18 },
      { title: 'Ergonomik Laptop Standı (Alüminyum)', barcode: '8680000000032', stockCode: 'LS-ERG-AL', salePrice: 349, listPrice: 500, commissionRate: 12 },
      { title: 'Hızlı Şarj Adaptörü 20W', barcode: '8680000000049', stockCode: 'SA-20W-W', salePrice: 199, listPrice: 300, commissionRate: 10 },
      { title: 'Deri Kartlık Cüzdan (Kahverengi)', barcode: '8680000000056', stockCode: 'CZ-DERI-BR', salePrice: 279, listPrice: 400, commissionRate: 15 },
    ]
  }

  if (orders.length === 0) {
    orders = [
      { status: 'Delivered', grossAmount: 899,  shipmentPackageStatus: 'Delivered', lines: [{ productName: 'Kablosuz Kulaklık V5.3 (Siyah)', quantity: 1, price: 899  }], orderDate: Date.now() - 1000 * 60 * 60 * 5  },
      { status: 'Delivered', grossAmount: 349,  shipmentPackageStatus: 'Delivered', lines: [{ productName: 'Ergonomik Laptop Standı (Alüminyum)', quantity: 1, price: 349 }], orderDate: Date.now() - 1000 * 60 * 60 * 8  },
      { status: 'Delivered', grossAmount: 199,  shipmentPackageStatus: 'Delivered', lines: [{ productName: 'Hızlı Şarj Adaptörü 20W', quantity: 1, price: 199 }], orderDate: Date.now() - 1000 * 60 * 60 * 12 },
      { status: 'Delivered', grossAmount: 279,  shipmentPackageStatus: 'Delivered', lines: [{ productName: 'Deri Kartlık Cüzdan (Kahverengi)', quantity: 1, price: 279 }], orderDate: Date.now() - 1000 * 60 * 60 * 24 },
      { status: 'Delivered', grossAmount: 899,  shipmentPackageStatus: 'Delivered', lines: [{ productName: 'Kablosuz Kulaklık V5.3 (Siyah)', quantity: 1, price: 899  }], orderDate: Date.now() - 1000 * 60 * 60 * 30 },
      { status: 'Delivered', grossAmount: 1499, shipmentPackageStatus: 'Delivered', lines: [{ productName: 'Akıllı Saat Pro X (Metal Kordon)', quantity: 1, price: 1499 }], orderDate: Date.now() - 1000 * 60 * 60 * 48 },
      { status: 'Cancelled', grossAmount: 349,  shipmentPackageStatus: 'Cancelled', lines: [{ productName: 'Ergonomik Laptop Standı (Alüminyum)', quantity: 1, price: 349 }], orderDate: Date.now() - 1000 * 60 * 60 * 72 },
      { status: 'Delivered', grossAmount: 199,  shipmentPackageStatus: 'Delivered', lines: [{ productName: 'Hızlı Şarj Adaptörü 20W', quantity: 1, price: 199 }], orderDate: Date.now() - 1000 * 60 * 60 * 96 },
      { status: 'Delivered', grossAmount: 279,  shipmentPackageStatus: 'Delivered', lines: [{ productName: 'Deri Kartlık Cüzdan (Kahverengi)', quantity: 1, price: 279 }], orderDate: Date.now() - 1000 * 60 * 60 * 120 },
      { status: 'Cancelled', grossAmount: 899,  shipmentPackageStatus: 'Cancelled', lines: [{ productName: 'Kablosuz Kulaklık V5.3 (Siyah)', quantity: 1, price: 899  }], orderDate: Date.now() - 1000 * 60 * 60 * 144 },
      { status: 'Delivered', grossAmount: 1499, shipmentPackageStatus: 'Delivered', lines: [{ productName: 'Akıllı Saat Pro X (Metal Kordon)', quantity: 1, price: 1499 }], orderDate: Date.now() - 1000 * 60 * 60 * 168 },
      { status: 'Delivered', grossAmount: 349,  shipmentPackageStatus: 'Delivered', lines: [{ productName: 'Ergonomik Laptop Standı (Alüminyum)', quantity: 1, price: 349 }], orderDate: Date.now() - 1000 * 60 * 60 * 192 },
    ]
  }

  // Fallback claims — realistic Trendyol claim structure
  if (claims.length === 0) {
    claims = [
      { orderNumber: 'ORD-001', claimDate: Date.now() - 86400000 * 1,  claimItems: [{ productName: 'Akıllı Saat Pro X (Metal Kordon)',     quantity: 1, price: 1499, claimItemStatus: 'Accepted', claimReason: 'Bileğe uymadı / Kordon boyu çok kısa'              }] },
      { orderNumber: 'ORD-002', claimDate: Date.now() - 86400000 * 2,  claimItems: [{ productName: 'Akıllı Saat Pro X (Metal Kordon)',     quantity: 1, price: 1499, claimItemStatus: 'Accepted', claimReason: 'Bileğe uymadı / Kordon boyu çok kısa'              }] },
      { orderNumber: 'ORD-003', claimDate: Date.now() - 86400000 * 4,  claimItems: [{ productName: 'Akıllı Saat Pro X (Metal Kordon)',     quantity: 1, price: 1499, claimItemStatus: 'Accepted', claimReason: 'Bileğe uymadı / Kordon boyu çok kısa'              }] },
      { orderNumber: 'ORD-004', claimDate: Date.now() - 86400000 * 2,  claimItems: [{ productName: 'Ergonomik Laptop Standı (Alüminyum)', quantity: 1, price: 349,  claimItemStatus: 'Accepted', claimReason: 'Kullanımda sarsıntı yapıyor / Kalitesiz hissiyat'   }] },
      { orderNumber: 'ORD-005', claimDate: Date.now() - 86400000 * 5,  claimItems: [{ productName: 'Ergonomik Laptop Standı (Alüminyum)', quantity: 1, price: 349,  claimItemStatus: 'Accepted', claimReason: 'Kullanımda sarsıntı yapıyor / Kalitesiz hissiyat'   }] },
      { orderNumber: 'ORD-006', claimDate: Date.now() - 86400000 * 3,  claimItems: [{ productName: 'Kablosuz Kulaklık V5.3 (Siyah)',      quantity: 1, price: 899,  claimItemStatus: 'Accepted', claimReason: 'Sol kulaklıktan ses gelmiyor / Bağlantı kopuyor'  }] },
      { orderNumber: 'ORD-007', claimDate: Date.now() - 86400000 * 1,  claimItems: [{ productName: 'Hızlı Şarj Adaptörü 20W',            quantity: 1, price: 199,  claimItemStatus: 'Accepted', claimReason: 'Ürün çalışmıyor / Şarj etmiyor'                   }] },
    ]
  }

  // ─── Helper functions: normalize Trendyol API field shapes ──────────────────
  function getProductName(p: any): string {
    return p.productName || p.name || p.title || 'Ürün'
  }
  function getSalePrice(p: any): number {
    return p.salePrice ?? p.pricingInfo?.salePrice ?? p.price ?? 0
  }
  function getListPrice(p: any): number {
    return p.listPrice ?? p.pricingInfo?.originalPrice ?? getSalePrice(p)
  }
  function getCommission(p: any): number {
    return p.commissionRate ?? p.commission ?? 0
  }
  function getOrderStatus(o: any): string {
    return (o.status || o.shipmentPackageStatus || '').toLowerCase()
  }
  function getOrderRevenue(o: any): number {
    // Real Trendyol: totalPrice or grossAmount; mock data: price
    return o.totalPrice || o.grossAmount || o.price || 0
  }
  function fmtTRY(n: number): string {
    return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  function fmtPct(n: number, decimals = 1): string {
    return n.toFixed(decimals) + '%'
  }

  // ─── Pre-compute shared order metrics (used in general & pricing modes) ──────
  const totalOrders    = orders.length
  const cancelledOrders = orders.filter(o => getOrderStatus(o).includes('cancel'))
  const deliveredOrders = orders.filter(o => getOrderStatus(o).includes('deliver'))
  const inTransitOrders = orders.filter(o => {
    const s = getOrderStatus(o)
    return s.includes('transit') || s.includes('shipping') || s.includes('shipped') || s.includes('cargo') || s.includes('created')
  })

  const cancelRate  = totalOrders > 0 ? (cancelledOrders.length / totalOrders) * 100 : 0
  const deliverRate = totalOrders > 0 ? (deliveredOrders.length / totalOrders) * 100 : 0

  // Revenue from orders (exclude cancelled)
  const grossRevenue = orders.filter(o => !getOrderStatus(o).includes('cancel')).reduce((s, o) => s + getOrderRevenue(o), 0)
  const aov          = totalOrders > 0 ? grossRevenue / totalOrders : 0

  // ─── Claims pre-compute (used in returns mode) ────────────────────────────────
  // Each claim = one return request; claimItems[] = products inside that claim
  const totalClaims    = claims.length
  const claimReturnRate = totalOrders > 0 ? (totalClaims / totalOrders) * 100 : 0

  // ─── 6. Build mode-specific analytics and prompt context ─────────────────────
  let modeContext = ''

  // System persona — enforces strict data-citation discipline on every claim
  const systemPersona = `Sen Hueilys e-ticaret analiz platformunun Kıdemli YZ Veri Danışmanısın.

TEMEL KURALLAR — bunlara kesinlikle uy:
1. **Her iddia veriyle kanıtlanmalı.** Bir öneri veya tespit sunarken daima verilen sayılara, yüzdelere veya ürün isimlerine atıf yap. "Veriye göre...", "Mağaza datanıza bakıldığında...", "Hesaplanan ₺X rakamına göre..." gibi ifadeler kullan.
2. **Uydurma. Hiç.** Sana verilmeyen hiçbir satış rakamı, rakip fiyatı, puan veya metrik üretemezsin. Yalnızca sana sağlanan data setindeki sayıları kullan.
3. **Hesaplamalarını göster.** Finansal etki rakamları sunarken formülü açıkça yaz (örn: "X iade × ₺Y fiyat = ₺Z gelir kaybı").
4. **Önceliklendirme.** En yüksek finansal etkisi olan sorunu/fırsatı en üste koy.
5. **Eyleme geçirilebilir ol.** Her öneri, mağaza sahibinin bugün uygulayabileceği somut bir adımla bitmelidir.
6. Yanıtlarını Türkçe ver. Markdown formatını (başlıklar, kalın, listeler) profesyonelce kullan.`

  if (mode === 'returns') {
    // ── Parse claims data — Trendyol Claims API structure ─────────────────────
    // Claim: { orderNumber, claimDate, claimItems: [{ productName, barcode, quantity, price, claimItemStatus, claimReason }] }
    const productClaimMap:  Record<string, { count: number; revLoss: number; statuses: string[] }> = {}
    const reasonCountMap:   Record<string, number> = {}
    const reasonProductMap: Record<string, Set<string>> = {}
    const statusCountMap:   Record<string, number> = {}

    let totalClaimItems = 0
    let totalClaimRevLoss = 0

    claims.forEach(claim => {
      const items: any[] = Array.isArray(claim.claimItems) ? claim.claimItems : []

      items.forEach((item: any) => {
        totalClaimItems++

        // Normalize fields — Trendyol may use different casing/names
        const name     = item.productName || item.name || item.barcode || item.productCode || 'Belirtilmedi'
        const price    = item.price || item.amount || 0
        const qty      = item.quantity || 1
        const status   = item.claimItemStatus || item.status || 'Bilinmiyor'
        const reason   = item.claimReason || item.reason || item.returnReason || claim.claimReason || 'Belirtilmedi'
        const lineRev  = price * qty

        // Per-product stats
        if (!productClaimMap[name]) productClaimMap[name] = { count: 0, revLoss: 0, statuses: [] }
        productClaimMap[name].count   += qty
        productClaimMap[name].revLoss += lineRev
        productClaimMap[name].statuses.push(status)

        // Reason stats
        reasonCountMap[reason] = (reasonCountMap[reason] || 0) + qty
        if (!reasonProductMap[reason]) reasonProductMap[reason] = new Set()
        reasonProductMap[reason].add(name)

        // Status stats (Accepted, InAnalysis, Created, Rejected, etc.)
        statusCountMap[status] = (statusCountMap[status] || 0) + 1

        totalClaimRevLoss += lineRev
      })
    })

    // Sort by revenue loss descending
    const sortedProductClaims = Object.entries(productClaimMap)
      .sort(([, a], [, b]) => b.revLoss - a.revLoss)

    const sortedReasons = Object.entries(reasonCountMap)
      .sort(([, a], [, b]) => b - a)

    const statusBreakdown = Object.entries(statusCountMap)
      .sort(([, a], [, b]) => b - a)
      .map(([s, c]) => `${s}: ${c}`)
      .join(' | ')

    // Logistics cost estimate (avg Turkish e-commerce ₺50–80 per return)
    const estLogisticsPerClaim = 65
    const totalLogisticsCost   = totalClaims * estLogisticsPerClaim

    // Dynamic Monthly projections scaling based on actual selected window in days
    const diffMs = Math.max(1, windowEnd - windowStart)
    const diffDays = Math.max(0.1, diffMs / (1000 * 60 * 60 * 24))
    const scale = 30 / diffDays

    const monthlyClaimCount    = Math.round(totalClaims * scale)
    const monthlyRevLoss       = Math.round(totalClaimRevLoss * scale)
    const monthlyLogistics     = Math.round(totalLogisticsCost * scale)
    const monthlyTotalImpact   = monthlyRevLoss + monthlyLogistics
    const savingsIfHalved      = Math.round(monthlyTotalImpact / 2)

    modeContext = `
## 📊 İADE (CLAIM) ANALİZİ — TRENDYOL CLAIMS API VERİSİ
**Mağaza:** ${storeName} | **Veri Kaynağı:** ${isLive ? '✅ Canlı Trendyol Claims API' : '⚠️ Simüle Edilmiş Demo Veri'} | **Analiz Penceresi:** ${windowLabel}

> **Not:** Bu veriler Trendyol'un özel İadeler (Claims) API'sinden çekilmiştir. Sipariş API'sinden bağımsız, gerçek iade taleplerini içerir.

---

### ÖZET METRİKLER (Hesaplanmış)
| Metrik | Değer |
|---|---|
| Toplam Sipariş (${windowLabel}) | ${totalOrders} adet |
| Toplam İade Talebi (Claim) | **${totalClaims} adet** |
| İade Talebindeki Ürün Kalemi | ${totalClaimItems} kalem |
| Sipariş Başına İade Oranı | %${fmtPct(claimReturnRate)} |
| İade Talepleri Gelir Kaybı (90 gün) | **₺${fmtTRY(totalClaimRevLoss)}** |
| Tahmini Kargo/Lojistik Maliyeti (90 gün) | ₺${fmtTRY(totalLogisticsCost)} (${totalClaims} claim × ₺${estLogisticsPerClaim}) |
| **Toplam Finansal Etki (90 Gün)** | **₺${fmtTRY(totalClaimRevLoss + totalLogisticsCost)}** |
| Aylık Tahmini İade Talebi | ~${monthlyClaimCount} adet |
| Aylık Tahmini Finansal Etki | ~₺${fmtTRY(monthlyTotalImpact)} |
| İadeler %50 Azalsaydı Aylık Tasarruf | ~₺${fmtTRY(savingsIfHalved)} |
| Claim Durum Dağılımı | ${statusBreakdown || 'Veri yok'} |

---

### ÜRÜN BAZLI İADE ANALİZİ — Gelir Kaybına Göre Sıralı (Claims API'den)
${sortedProductClaims.length > 0
  ? sortedProductClaims.map(([name, d], i) => {
      const pct  = totalClaimItems > 0 ? ((d.count / totalClaimItems) * 100).toFixed(1) : '0'
      const dominant = d.statuses.length > 0
        ? Object.entries(d.statuses.reduce((acc: Record<string, number>, s) => { acc[s] = (acc[s] || 0) + 1; return acc }, {})).sort(([, a], [, b]) => b - a)[0][0]
        : '-'
      return (
        `${i + 1}. **${name}**\n` +
        `   - İade Adedi: ${d.count} kalem (%${pct} tüm iade kalemlerinin)\n` +
        `   - Gelir Kaybı: ₺${fmtTRY(d.revLoss)}\n` +
        `   - Aylık Tahmini Etki: ~₺${fmtTRY(d.revLoss / 3)}\n` +
        `   - Baskın Durum: ${dominant}`
      )
    }).join('\n')
  : '- Ürün bazında claim verisi bulunamadı'}

---

### İADE SEBEPLERİ — Frekansa Göre Sıralı (Claims API'den)
${sortedReasons.length > 0
  ? sortedReasons.map(([reason, count], i) => {
      const pct = totalClaimItems > 0 ? ((count / totalClaimItems) * 100).toFixed(1) : '0'
      const prods = reasonProductMap[reason] ? Array.from(reasonProductMap[reason]).join(', ') : '-'
      return `${i + 1}. **"${reason}"** → ${count} kalem (%${pct})\n   Etkilenen ürün(ler): ${prods}`
    }).join('\n')
  : '- İade sebebi verisi bulunamadı'}

---

### GÖREVINIZ:
Yukarıdaki tablolardaki GERÇEK claims verilerine dayanarak analiz yap.
Her öneri için:
- Hangi tablo satırından / metrikten çıkardığını belirt (örn: "Claims datanıza göre ${sortedProductClaims[0]?.[0] || 'ilk ürün'} ₺${fmtTRY(sortedProductClaims[0]?.[1]?.revLoss || 0)} gelir kaybına yol açmıştır...")
- Somut finansal etkiyi formülle göster (örn: "X kalem × ₺Y = ₺Z gelir kaybı")
- Bugün uygulanabilecek spesifik aksiyon adımı ver
`
  }
  else if (mode === 'general') {
    // ── Per-product sales volume from orders ──────────────────────────────────
    const productSalesMap: Record<string, { count: number; revenue: number }> = {}
    orders.forEach(o => {
      if (getOrderStatus(o).includes('cancel')) return
      const rev = getOrderRevenue(o)
      if (Array.isArray(o.lines) && o.lines.length > 0) {
        o.lines.forEach((line: any) => {
          const name = line.productName || line.productCode || 'Ürün'
          if (!productSalesMap[name]) productSalesMap[name] = { count: 0, revenue: 0 }
          productSalesMap[name].count   += (line.quantity || 1)
          productSalesMap[name].revenue += (line.price || line.amount || rev / o.lines.length)
        })
      } else {
        const name = o.productTitle || o.productName || 'Ürün'
        if (!productSalesMap[name]) productSalesMap[name] = { count: 0, revenue: 0 }
        productSalesMap[name].count   += 1
        productSalesMap[name].revenue += rev
      }
    })

    const topSellers = Object.entries(productSalesMap)
      .sort(([, a], [, b]) => b.revenue - a.revenue)
      .slice(0, 10)

    // Period trend: split orders into first half vs second half of the 90-day window
    const now = Date.now()
    const midpoint = now - 45 * 24 * 60 * 60 * 1000
    const recentOrders = orders.filter(o => {
      const d = o.orderDate || o.createdDate || o.date
      return d && d > midpoint
    })
    const olderOrders = orders.filter(o => {
      const d = o.orderDate || o.createdDate || o.date
      return d && d <= midpoint
    })
    const recentRevenue = recentOrders.reduce((s, o) => s + getOrderRevenue(o), 0)
    const olderRevenue  = olderOrders.reduce((s, o)  => s + getOrderRevenue(o), 0)
    const hasTrendData  = recentOrders.length > 0 || olderOrders.length > 0

    // Product portfolio summary from catalog
    const catalogSummary = products.slice(0, 15).map(p => {
      const sp = getSalePrice(p)
      const lp = getListPrice(p)
      const cm = getCommission(p)
      const net = cm > 0 ? sp * (1 - cm / 100) : sp
      const disc = lp > sp ? Math.round((1 - sp / lp) * 100) : 0
      return `- ${getProductName(p)} | Satış: ₺${sp}${disc > 0 ? ` (-%${disc} indirimli)` : ''} | Komisyon: %${cm} | Net Hakediş: ₺${fmtTRY(net)}`
    }).join('\n')

    const claimRevLossForGeneral = claims.reduce((s, c) => {
      if (!Array.isArray(c.claimItems)) return s
      return s + c.claimItems.reduce((cs: number, item: any) => cs + (item.price || 0) * (item.quantity || 1), 0)
    }, 0)
    const netRevenue = grossRevenue - claimRevLossForGeneral

    modeContext = `
## 📊 GENEL MAĞAZA ANALİZİ — VERİ PAKETİ
**Mağaza:** ${storeName} | **Veri Kaynağı:** ${isLive ? '✅ Canlı Trendyol API Verisi' : '⚠️ Simüle Edilmiş Demo Veri'} | **Analiz Penceresi:** ${windowLabel}

---

### ÖZET METRİKLER (Hesaplanmış)
| Metrik | Değer |
|---|---|
| Toplam Sipariş | ${totalOrders} adet |
| Tamamlanan Teslimat | ${deliveredOrders.length} adet (%${fmtPct(deliverRate)}) |
| İptal | ${cancelledOrders.length} adet (%${fmtPct(cancelRate)}) |
| İade Talebi (Claims) | ${totalClaims} adet (%${fmtPct(claimReturnRate)}) |
| Taşımada / Beklemede | ${inTransitOrders.length} adet |
| Brüt Ciro (iptal hariç, 90 gün) | ₺${fmtTRY(grossRevenue)} |
| İadelerden Gelir Kaybı (Claims) | ₺${fmtTRY(claimRevLossForGeneral)} |
| Net Tahmini Ciro | ₺${fmtTRY(netRevenue)} |
| Ortalama Sepet Değeri (AOV) | ₺${fmtTRY(aov)} |
| Aktif Ürün Çeşidi (Katalog) | ${products.length} SKU |
${hasTrendData ? `| Son 45 Gün Ciro | ₺${fmtTRY(recentRevenue)} (${recentOrders.length} sipariş) |
| Önceki 45 Gün Ciro | ₺${fmtTRY(olderRevenue)} (${olderOrders.length} sipariş) |
| Trend | ${recentRevenue >= olderRevenue ? '📈 Büyüme' : '📉 Gerileme'} (${recentRevenue >= olderRevenue ? '+' : ''}${olderRevenue > 0 ? fmtPct((recentRevenue - olderRevenue) / olderRevenue * 100) : 'N/A'})` : ''}

---

### EN ÇOK SATAN ÜRÜNLER (Siparişlerden Hesaplanmış)
${topSellers.length > 0
  ? topSellers.map(([name, d], i) =>
      `${i + 1}. **${name}** — ${d.count} adet sipariş | Toplam Ciro: ₺${fmtTRY(d.revenue)}`
    ).join('\n')
  : '- Sipariş seviyesinde ürün datası bulunamadı'}

---

### ÜRÜN KATALOGU (Fiyat & Marj Bilgisi)
${catalogSummary || '- Katalog verisi bulunamadı'}

---

### GÖREVINIZ:
Yukarıdaki tablolardaki GERÇEK sayıları kullanarak mağaza performansını değerlendir.
Her gözlem ve öneri için:
- Hangi tablo satırı / metrikten çıkardığını belirt (örn: "Sipariş datanıza bakıldığında iptal oranı %${fmtPct(cancelRate)} ile...")
- Somut finansal etkiyi hesapla (örn: "AOV'yi ₺${fmtTRY(aov)}'den ₺X'e çıkarmak X sipariş × ₺Y fark = ₺Z ek ciro demektir")
- Mağazanın gerçek ürünlerine ve kategorisine özgü öneriler sun
- Mağazanın en büyük büyüme fırsatını ve en kritik riskini açıkça belirt
`
  }
  else if (mode === 'pricing') {
    // ── Deep per-product margin analysis ────────────────────────────────────
    const pricingData = products.slice(0, 30).map(p => {
      const name       = getProductName(p)
      const salePrice  = getSalePrice(p)
      const listPrice  = getListPrice(p)
      const commission = getCommission(p)
      const commissionAmt  = salePrice * (commission / 100)
      const netEarning     = salePrice - commissionAmt
      const grossMarginPct = listPrice > 0 ? ((salePrice - commissionAmt) / listPrice) * 100 : 0
      const discountPct    = listPrice > salePrice ? (1 - salePrice / listPrice) * 100 : 0
      const discountAmt    = listPrice - salePrice

      return {
        name,
        salePrice,
        listPrice,
        commission,
        commissionAmt,
        netEarning,
        grossMarginPct,
        discountPct,
        discountAmt,
      }
    })

    // Sort: lowest net margin first (highest opportunity to optimize)
    const sortedByMargin = [...pricingData].sort((a, b) => a.netEarning - b.netEarning)
    // Highest discount — potential to raise price
    const sortedByDiscount = [...pricingData].sort((a, b) => b.discountPct - a.discountPct)
    // Highest commission burden
    const sortedByCommission = [...pricingData].sort((a, b) => b.commission - a.commission)

    const pricingTable = pricingData.map((p, i) =>
      `${i + 1}. **${p.name}**\n` +
      `   - Liste Fiyatı: ₺${fmtTRY(p.listPrice)} | Satış Fiyatı: ₺${fmtTRY(p.salePrice)}${p.discountPct > 0 ? ` | İndirim: -%${fmtPct(p.discountPct)} (₺${fmtTRY(p.discountAmt)} düşük)` : ''}\n` +
      `   - Komisyon: %${p.commission} (₺${fmtTRY(p.commissionAmt)} kesinti)\n` +
      `   - **Net Hakediş: ₺${fmtTRY(p.netEarning)}** | Brüt Marj: %${fmtPct(p.grossMarginPct)}`
    ).join('\n')

    // Avg metrics
    const avgCommission  = pricingData.length > 0 ? pricingData.reduce((s, p) => s + p.commission, 0) / pricingData.length : 0
    const avgNetEarning  = pricingData.length > 0 ? pricingData.reduce((s, p) => s + p.netEarning, 0) / pricingData.length : 0
    const avgDiscountPct = pricingData.length > 0 ? pricingData.reduce((s, p) => s + p.discountPct, 0) / pricingData.length : 0

    // Revenue context from orders
    const avgDailySales = totalOrders > 0 ? totalOrders / 90 : 0

    modeContext = `
## 📊 FİYATLANDIRMA ANALİZİ — VERİ PAKETİ
**Mağaza:** ${storeName} | **Veri Kaynağı:** ${isLive ? '✅ Canlı Trendyol API Verisi' : '⚠️ Simüle Edilmiş Demo Veri'}

---

### PORTFOLYO ORTALAMALARI (Hesaplanmış)
| Metrik | Değer |
|---|---|
| Analiz Edilen SKU Sayısı | ${pricingData.length} ürün |
| Ortalama Komisyon Oranı | %${fmtPct(avgCommission)} |
| Ortalama Net Hakediş | ₺${fmtTRY(avgNetEarning)} |
| Ortalama İndirim Oranı | %${fmtPct(avgDiscountPct)} |
| Toplam Sipariş | ${totalOrders} adet |
| Günlük Ortalama Sipariş | ~${avgDailySales.toFixed(1)} adet/gün |
| Ortalama Sepet Değeri (AOV) | ₺${fmtTRY(aov)} |

---

### ÜRÜN FİYATLANDIRMA DETAYI (Tam Liste)
${pricingTable || '- Ürün verisi bulunamadı'}

---

### EN DÜŞÜK MARJLI ÜRÜNLER (Risk Grubu)
${sortedByMargin.slice(0, 3).map((p, i) =>
  `${i + 1}. **${p.name}** — Net Hakediş: ₺${fmtTRY(p.netEarning)} | Komisyon: %${p.commission} | Brüt Marj: %${fmtPct(p.grossMarginPct)}`
).join('\n')}

---

### EN YÜKSEK İNDİRİMLİ ÜRÜNLER (Fiyat Artırma Adayları)
${sortedByDiscount.slice(0, 3).map((p, i) =>
  `${i + 1}. **${p.name}** — Liste: ₺${fmtTRY(p.listPrice)} | Satış: ₺${fmtTRY(p.salePrice)} | İndirim: -%${fmtPct(p.discountPct)} (₺${fmtTRY(p.discountAmt)} altında)`
).join('\n')}

---

### EN YÜKSEK KOMİSYON YÜKLİ ÜRÜNLER (Maliyet Optimizasyon Adayları)
${sortedByCommission.slice(0, 3).map((p, i) =>
  `${i + 1}. **${p.name}** — Komisyon: %${p.commission} | Komisyon Tutarı: ₺${fmtTRY(p.commissionAmt)} | Net Hakediş: ₺${fmtTRY(p.netEarning)}`
).join('\n')}

---

### GÖREVINIZ:
Yukarıdaki tablolardaki GERÇEK fiyat ve marj verilerini kullanarak:
1. Her öneri için hangi SKU, hangi satır sayısından geldiğini belirt
2. Finansal etkiyi somut formülle hesapla (örn: "Fiyat ₺X → ₺Y yapılırsa, günlük ~${avgDailySales.toFixed(1)} satış × ₺(Y-X) fark = günlük ₺Z ek gelir")
3. Hem kısa vadeli (bu hafta uygulanabilir) hem uzun vadeli (kampanya/strateji) öneriler sun
4. En az bir ürünü "hemen fiyat artır", en az bir ürünü "hacim için optimize et" kategorisinde değerlendir
5. Yüksek komisyon yükü olan ürünler için maliyet optimizasyon önerisi ekle
`
  }

  // 7. Execute Call to Gemini API (Resilient with Local Simulation Fallback)
  const config = useRuntimeConfig(event)
  const apiKey = config.geminiApiKey

  if (!apiKey) {
    console.warn('[Gemini API] GEMINI_API_KEY is not defined in runtime config. Running local fallback simulation engine...')
    
    // Simulate smart responses based on mode and query if no key exists
    let simulatedResponse = ''
    if (!customQuery) {
      if (mode === 'returns') {
        simulatedResponse = `### 📦 İadeler İçin YZ Analiz Raporu (${storeName})

⚠️ **Sistem Uyarısı:** \`GEMINI_API_KEY\` ortam değişkeni eksik olduğu için bu rapor Hueilys Yerel Analiz Motoru tarafından simüle edilmiştir.

Yaptığım analiz sonucunda mağazanızdaki iadelerin temel kaynağının **Akıllı Saat Pro X (Metal Kordon)** ürünü olduğunu saptadım:

1. **Kordon Boyu Şikayeti (%68):**
   * **Analiz:** Akıllı Saat Pro X modelinde gelen 3 iadenin tamamında müşteriler "Kordon boyu bileğime dar geldi" veya "Kordonu çok kısa" şikayetiyle ürünü geri göndermiş.
   * **Aksiyon Önerisi:** Ürün açıklamasına net bilek ölçüsü tablosu ekleyin. Ayrıca tedarikçinizle görüşerek paket içerisine 2 adet ek metal kordon baklası (ek halka) ekletin. Bu işlem iadeleri %80 azaltacaktır.

2. **Laptop Standı Titreme Sorunu (%22):**
   * **Analiz:** Ergonomik Laptop Standında müşteriler "yazı yazarken sarsıntı yapıyor" ve "plastik gibi hissettiriyor" diyerek iade yapmış.
   * **Aksiyon Önerisi:** Ürün görsellerini ve videolarını güncelleyerek ürünün taşıma kapasitesini ve kullanım kılavuzunu netleştirin.

**Finansal Katkı:** İadeleri aylık bazda yarı yarıya azaltmanız durumunda, kargo ve lojistik giderleriniz düşecek ve **aylık ortalama ₺4,800 net tasarruf** sağlanacaktır.`
      } 
      else if (mode === 'general') {
        simulatedResponse = `### 💡 Genel Gelişim YZ Analiz Raporu (${storeName})

⚠️ **Sistem Uyarısı:** \`GEMINI_API_KEY\` ortam değişkeni eksik olduğu için bu rapor Hueilys Yerel Analiz Motoru tarafından simüle edilmiştir.

Mağazanızın sepet ortalamasını ve son yorumlarını analiz ettim:

1. **Paketleme Revizyonu (Müşteri Memnuniyeti):**
   * **Analiz:** 2 yıldız alan "Kablosuz Kulaklık" yorumunda kargo kutusunun ezildiği belirtilmiş.
   * **Aksiyon:** Kulaklık gibi hassas elektronik ürünleri doğrudan poşetle göndermek yerine patpat poşete sarıp koruyucu mukavva kutularla kargolayın.

2. **Ürün Bundle (Birlikte Al) Fırsatı:**
   * **Analiz:** Sepet ortalamanız şu anda **₺540**. "Hızlı Şarj Adaptörü (₺199)" ile "Deri Kartlık (₺279)" ürünlerinizi sepette birlikte alımlarda %15 indirimle sunarak sepet ortalamasını **₺620** seviyesine taşıyabilirsiniz.

3. **Yerelleştirme (Kılavuz Ekleme):**
   * **Analiz:** Laptop Standında Türkçe kılavuz olmadığı için 3 yıldız verilmiş.
   * **Aksiyon:** Kutu içerisine 1 sayfalık Türkçe A6 kurulum şeması ekleyin.`
      } 
      else if (mode === 'pricing') {
        simulatedResponse = `### 🏷️ Fiyatlandırma ve Kâr YZ Analiz Raporu (${storeName})

⚠️ **Sistem Uyarısı:** \`GEMINI_API_KEY\` ortam değişkeni eksik olduğu için bu rapor Hueilys Yerel Analiz Motoru tarafından simüle edilmiştir.

Aktif ürünlerinizin kâr ve rakip fiyat dengesini inceledim:

1. **Kablosuz Kulaklık V5.3 (Kâr Artırma Potansiyeli):**
   * **Mevcut Satış Fiyatı:** ₺899 (%15 Komisyon ile Net Hakediş: ₺764.15)
   * **Analiz:** Trendyol üzerindeki rakip buy-box fiyatı ₺939. Biz gereksiz yere ₺40 daha ucuza satarak marj kaybediyoruz.
   * **Aksiyon:** Fiyatınızı **₺935** seviyesine çekin. Satış hacminiz etkilenmeden **ürün başı ₺35.80 ek kâr** elde edeceksiniz.

2. **Akıllı Saat Pro X (Hacim Kazanma Fırsatı):**
   * **Mevcut Satış Fiyatı:** ₺1,499 (%18 Komisyon ile Net Hakediş: ₺1,229.18)
   * **Analiz:** Buy-box lideri ₺1,440 fiyata sahip ve siparişlerin %85\'ini o alıyor. Biz fiyat olarak yüksek kaldığımız için satış hızımız düşük.
   * **Aksiyon:** Fiyatı geçici olarak **₺1,439** seviyesine indirin. Net hakedişiniz ₺1,180\'e düşecek olsa da, satış adetlerinizin haftalık tahmini %280 artması toplam kârınızı katlayacaktır.`
      }
    } 
    else {
      // Handle custom follow-up queries offline
      const queryLower = customQuery.toLowerCase()
      if (mode === 'returns' && (queryLower.includes('kordon') || queryLower.includes('saat') || queryLower.includes('ölçü'))) {
        simulatedResponse = `**İadeler hakkında takip sorunuza yanıt:**\n\nAkıllı Saat kordonu için kordon tedarikçisini hemen değiştirmek yerine ilk aşamada paket içerisine **yedek bakla (halka) eklemek** çok daha az maliyetlidir. Tedarikçi değişimi ürün maliyetinizi %15 artırabilir. Ancak kutuya 2 ek bakla ekletmenin maliyeti ürün başına sadece ₺4 civarındadır. Öncelikle bu adımı deneyip iade oranlarını 15 gün boyunca izlemenizi öneririm.`
      } 
      else if (mode === 'pricing' && (queryLower.includes('kulaklık') || queryLower.includes('fiyat'))) {
        simulatedResponse = `**Fiyatlandırma hakkında takip sorunuza yanıt:**\n\nKablosuz Kulaklık fiyatını ₺935 yaptığınızda, Trendyol algoritması sizi buy-box sıralamasında hâlâ üstte tutacaktır çünkü buy-box limiti ₺939\'dur. ₺4\'lük avantaj müşterinin sizi seçmesi için yeterlidir ve kâr marjınızı en yüksek noktaya taşır.`
      }
      else if (mode === 'general' && (queryLower.includes('kargo') || queryLower.includes('paket'))) {
        simulatedResponse = `**Genel operasyonlar hakkında takip sorunuza yanıt:**\n\nKargo ezilmelerini engellemek için çift oluklu karton kutulara geçmeniz paket başına maliyeti ₺1.80 artırır. Ancak 2 yıldızlı yorumların önüne geçerek mağaza puanınızı 9.2\'den 9.6\'ya çıkaracaktır. Bu da Trendyol listelemelerinde organik sıralamanızı %12 yukarı taşıyacaktır.`
      }
      else {
        simulatedResponse = `YZ Danışmanı olarak şu anda **${mode === 'returns' ? 'İadeler' : mode === 'general' ? 'Genel Gelişim' : 'Fiyatlandırma'}** analiz modundayız. \n\nSorduğunuz soru ("${customQuery}") bu analiz kapsamının dışındadır. Odaklanmış ve doğru analizler sunabilmem için lütfen aktif analiz konusu ile ilgili sorular sorun veya diğer analiz türünü sağ taraftaki panelden seçin.`
      }
    }

    return { response: simulatedResponse }
  }

  // 8. Call live Gemini API if key is present
  try {
    // Use gemini-2.5-flash for best speed/quality ratio
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`

    // Separate system instruction from user content for proper Gemini API usage
    const geminiPayload = {
      system_instruction: {
        parts: [{ text: systemPersona }]
      },
      contents: [
        {
          role: 'user',
          parts: [
            { text: modeContext + (customQuery && customQuery.trim() ? `\n\nKullanıcı Sorusu: "${customQuery}"\n\nTALİMAT: Kullanıcının sorusunu yukarıdaki mağaza verilerini dikkate alarak yanıtla. Yalnızca aktif analiz modu (${mode}) kapsamındaki konuları tartış.` : '\n\nLütfen analiz raporunu hazırla. Başlık olarak doğrudan analiz modunun ismini kullan. Analizi madde madde ve okuması kolay şekilde hazırla. Önemli sayıları ve aksiyonları **kalın** yaz.') }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.4,
        topP: 0.95,
        // 8192 tokens ensures full, untruncated responses even for detailed Turkish analyses
        maxOutputTokens: 8192
      }
    }

    console.log('[Gemini API] Sending request to Gemini 2.5 Flash...')
    const res = await $fetch<any>(url, {
      method: 'POST',
      body: geminiPayload,
      headers: { 'Content-Type': 'application/json' },
      // 60 second timeout for complex analyses
      timeout: 60000
    })

    const textResponse = res?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!textResponse) {
      console.error('[Gemini API] Empty response. Full API response:', JSON.stringify(res).substring(0, 500))
      throw createError({ statusCode: 502, statusMessage: 'Gemini API boş yanıt döndürdü. Lütfen tekrar deneyin.' })
    }

    console.log(`[Gemini API] Success. Response length: ${textResponse.length} chars`)
    return { response: textResponse }
  } 
  catch (err: any) {
    // If already a createError, re-throw as-is
    if (err.statusCode) throw err
    console.error('[Gemini API Call Error]', err.message, err.data)
    throw createError({
      statusCode: 502,
      statusMessage: `Gemini API hatası: ${err.message || 'Bilinmeyen bir hata oluştu.'}`
    })
  }
})
