/**
 * useOrders — Composable for fetching and filtering orders from the server API.
 * Supports pagination, status filter, date range, and order number search.
 * Integrates with useDateRange for global time window filtering.
 */

import type { TrendyolOrder, TrendyolOrdersResponse } from '~/types'

export function useOrders() {
  // ─── State ──────────────────────────────────────────────────────────────────
  const orders        = ref<TrendyolOrder[]>([])
  const totalElements = ref(0)
  const totalPages    = ref(0)
  const isLoading     = ref(false)
  const error         = ref<string | null>(null)

  // ─── Filters ─────────────────────────────────────────────────────────────────
  const page        = ref(0)
  const size        = ref(20)
  const status      = ref('all')
  const orderNumber = ref('')
  // Manual date overrides (used in the list tab's date pickers; empty = use global range)
  const startDate   = ref('')
  const endDate     = ref('')

  // ─── Fetch ──────────────────────────────────────────────────────────────────
  async function fetchOrders(storeId: string, overrideStartTs?: number, overrideEndTs?: number) {
    if (!storeId) return

    isLoading.value = true
    error.value     = null

    try {
      const params: Record<string, string | number> = {
        storeId,
        page:      page.value,
        size:      size.value,
      }

      // Manual date pickers take priority; otherwise use global range timestamps
      if (startDate.value) {
        params.startDate = new Date(startDate.value).getTime()
      } else if (overrideStartTs !== undefined) {
        params.startDate = overrideStartTs
      }

      if (endDate.value) {
        params.endDate = new Date(endDate.value + 'T23:59:59').getTime()
      } else if (overrideEndTs !== undefined) {
        params.endDate = overrideEndTs
      }

      if (status.value && status.value !== 'all')
        params.status = status.value

      if (orderNumber.value.trim())
        params.orderNumber = orderNumber.value.trim()

      const data = await $fetch<TrendyolOrdersResponse>('/api/trendyol/orders', { params })

      orders.value        = data.content        ?? []
      totalElements.value = data.totalElements  ?? 0
      totalPages.value    = data.totalPages     ?? 0
    }
    catch (err: unknown) {
      const e = err as { statusMessage?: string; message?: string }
      error.value   = e.statusMessage || e.message || 'Siparişler yüklenirken hata oluştu.'
      orders.value  = []
    }
    finally {
      isLoading.value = false
    }
  }

  function resetPage() {
    page.value = 0
  }

  return {
    // state
    orders, totalElements, totalPages, isLoading, error,
    // filters
    page, size, status, orderNumber, startDate, endDate,
    // actions
    fetchOrders, resetPage,
  }
}
