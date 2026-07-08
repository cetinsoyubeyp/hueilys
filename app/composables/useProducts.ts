/**
 * useProducts — Composable for fetching and filtering products from the server API.
 * Supports pagination and keyword search by title / SKU / barcode.
 */

export interface TrendyolProductImage {
  url: string
}

export interface TrendyolProduct {
  title: string
  barcode: string
  stockCode: string
  listPrice: number
  salePrice: number
  commissionRate: number
  quantity: number
  images?: TrendyolProductImage[]
}

export interface TrendyolProductsResponse {
  content: TrendyolProduct[]
  totalElements: number
}

export function useProducts() {
  const products = ref<TrendyolProduct[]>([])
  const totalElements = ref(0)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const page = ref(0)
  const size = ref(50)
  const searchKeyword = ref('')

  async function fetchProducts(storeId: string) {
    if (!storeId) return

    isLoading.value = true
    error.value = null

    try {
      const params: Record<string, string | number> = {
        storeId,
      }

      const data = await $fetch<TrendyolProductsResponse>('/api/trendyol/products', { params })

      let list = data.content ?? []

      // Client side search filter to support fast interactive queries
      if (searchKeyword.value.trim()) {
        const kw = searchKeyword.value.toLowerCase().trim()
        list = list.filter(p => {
          const title = (p.title || '').toLowerCase()
          const barcode = (p.barcode || '').toLowerCase()
          const stockCode = (p.stockCode || '').toLowerCase()
          return title.includes(kw) || barcode.includes(kw) || stockCode.includes(kw)
        })
      }

      products.value = list
      totalElements.value = list.length
    }
    catch (err: unknown) {
      const e = err as { statusMessage?: string; message?: string }
      error.value = e.statusMessage || e.message || 'Ürünler yüklenirken hata oluştu.'
      products.value = []
    }
    finally {
      isLoading.value = false
    }
  }

  function resetPage() {
    page.value = 0
  }

  return {
    products,
    totalElements,
    isLoading,
    error,
    page,
    size,
    searchKeyword,
    fetchProducts,
    resetPage,
  }
}
