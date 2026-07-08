<script setup lang="ts">
/**
 * dashboard/orders/index.vue — Orders management page.
 * Fetches connected Trendyol stores, then loads orders via server API proxy.
 * Supports filtering by status, date range (global DateRangePicker), and order number.
 * Displays tabs for Analytics Dashboard and Order List.
 */

import type { Store } from '~/types'

definePageMeta({
  layout:     'dashboard',
  middleware: 'auth',
})

useSeoMeta({
  title:   'Siparişler — Hueilys',
  robots:  'noindex',
})

const supabase = useSupabaseClient()

const {
  orders, totalElements, totalPages, isLoading, error,
  page, size, status, orderNumber, startDate, endDate,
  fetchOrders, resetPage,
} = useOrders()

// Global date range
const { startTs, endTs, shortLabel, selectedRange } = useDateRange()

// Local pagination for the table list tab
const localPage = ref(0)
const localPageSize = ref(20)

const localTotalPages = computed(() => {
  return Math.ceil(orders.value.length / localPageSize.value)
})

const paginatedOrders = computed(() => {
  const start = localPage.value * localPageSize.value
  const end = start + localPageSize.value
  return orders.value.slice(start, end)
})

function goToLocalPage(p: number) {
  if (p < 0 || p >= localTotalPages.value) return
  localPage.value = p
}

watch(orders, () => {
  localPage.value = 0
})

const visibleLocalPages = computed(() => {
  const total = localTotalPages.value
  const cur   = localPage.value
  const range: (number | '...')[] = []

  if (total <= 7) {
    for (let i = 0; i < total; i++) range.push(i)
    return range
  }

  range.push(0)
  if (cur > 2) range.push('...')
  for (let i = Math.max(1, cur - 1); i <= Math.min(total - 2, cur + 1); i++) range.push(i)
  if (cur < total - 3) range.push('...')
  range.push(total - 1)
  return range
})

const activeTab = ref<'analytics' | 'list'>('analytics')

// ─── Stores ────────────────────────────────────────────────────────────────
const stores         = ref<Store[]>([])
const selectedStore  = ref<Store | null>(null)
const isFetchingStores = ref(true)

async function loadStores() {
  isFetchingStores.value = true
  const { data } = await supabase
    .from('stores')
    .select('*')
    .eq('marketplace', 'trendyol')
    .order('created_at', { ascending: false })

  stores.value         = (data as Store[]) ?? []
  selectedStore.value  = stores.value[0] ?? null
  isFetchingStores.value = false

  if (selectedStore.value) fetchOrders(selectedStore.value.id, startTs.value, endTs.value)
}

onMounted(loadStores)

// Re-fetch when store changes
watch(selectedStore, (s) => { if (s) { resetPage(); fetchOrders(s.id, startTs.value, endTs.value) } })

// Re-fetch when global date range changes
watch(selectedRange, () => {
  if (!selectedStore.value) return
  resetPage()
  fetchOrders(selectedStore.value.id, startTs.value, endTs.value)
})

// Re-fetch when list-tab filters change
watch([status, startDate, endDate], () => {
  if (!selectedStore.value) return
  resetPage()
  fetchOrders(selectedStore.value.id, startTs.value, endTs.value)
})

let searchTimeout: ReturnType<typeof setTimeout>
watch(orderNumber, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    if (!selectedStore.value) return
    resetPage()
    fetchOrders(selectedStore.value.id, startTs.value, endTs.value)
  }, 400)
})

function handleRefresh() {
  if (selectedStore.value) fetchOrders(selectedStore.value.id, startTs.value, endTs.value)
}

// ─── Status filter options ──────────────────────────────────────────────────
const statusOptions = [
  { value: 'all',             label: 'Tüm Durumlar' },
  { value: 'Created',         label: 'Yeni Sipariş' },
  { value: 'Picking',         label: 'Hazırlanıyor' },
  { value: 'Invoiced',        label: 'Faturalandı' },
  { value: 'Shipped',         label: 'Kargoya Verildi' },
  { value: 'Delivered',       label: 'Teslim Edildi' },
  { value: 'Cancelled',       label: 'İptal Edildi' },
  { value: 'UnDelivered',     label: 'Teslim Edilemedi' },
  { value: 'Returned',        label: 'İade Edildi' },
]

</script>

<template>
  <div class="p-6 lg:p-8 space-y-6">

    <!-- Loading stores -->
    <div v-if="isFetchingStores" class="flex items-center justify-center min-h-[60vh]">
      <div class="flex flex-col items-center gap-3">
        <div class="w-8 h-8 border-2 border-[var(--color-primary-lighter)] border-t-[var(--color-primary)] rounded-full animate-spin" />
        <p class="text-sm text-[var(--color-text-muted)]">Mağazalar yükleniyor…</p>
      </div>
    </div>

    <!-- No stores -->
    <div v-else-if="stores.length === 0" class="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div class="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center mb-4 mx-auto">
        <svg class="w-8 h-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </div>
      <h2 class="text-lg font-bold text-[var(--color-text-primary)] mb-1">Bağlı Trendyol mağazası yok</h2>
      <p class="text-sm text-[var(--color-text-secondary)] mb-4">Siparişleri görmek için önce bir Trendyol mağazası bağlamanız gerekiyor.</p>
      <NuxtLink to="/dashboard" class="btn btn-primary px-5 py-2.5 text-sm">Pano'ya Git</NuxtLink>
    </div>

    <!-- Main content -->
    <template v-else>

      <!-- ─── Page header ───────────────────────────────────────────────────── -->
      <div class="flex flex-col gap-3">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 class="text-xl font-bold text-[var(--color-text-primary)]">Siparişler</h1>
            <p class="text-sm text-[var(--color-text-muted)] mt-0.5">
              <template v-if="!isLoading">
                Toplam {{ totalElements.toLocaleString('tr-TR') }} sipariş
              </template>
              <template v-else>Yükleniyor…</template>
            </p>
          </div>

          <div class="flex items-center gap-2">
            <!-- Refresh -->
            <button
              type="button"
              class="w-9 h-9 rounded-xl bg-white border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary-lighter)] transition-all"
              :class="isLoading ? 'animate-spin' : ''"
              aria-label="Yenile"
              :disabled="isLoading"
              @click="handleRefresh"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- ─── Global Date Range Picker ─────────────────────────────────────── -->
        <DateRangePicker />
      </div>

      <!-- Tab switcher -->
      <div class="flex border-b border-[var(--color-border)] mb-4">
        <button
          type="button"
          :class="[
            'px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer',
            activeTab === 'analytics'
              ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
              : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]',
          ]"
          @click="activeTab = 'analytics'"
        >
          Analiz & Grafikler
        </button>
        <button
          type="button"
          :class="[
            'px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer',
            activeTab === 'list'
              ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
              : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]',
          ]"
          @click="activeTab = 'list'"
        >
          Sipariş Listesi
        </button>
      </div>

      <!-- ─── ANALYTICS TAB ────────────────────────────────────────────────────── -->
      <template v-if="activeTab === 'analytics'">
        <!-- Data window label -->
        <div class="flex items-center gap-2 text-xs text-[var(--color-text-muted)] font-medium">
          <svg class="w-3.5 h-3.5 text-[var(--color-primary)]" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/>
          </svg>
          Grafikler <strong class="text-[var(--color-text-primary)]">{{ shortLabel }}</strong> çekiliyor
        </div>

        <div v-if="isLoading" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div v-for="i in 4" :key="i" class="h-24 bg-white rounded-2xl border border-[var(--color-border)] animate-pulse" />
          </div>
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-2 h-64 bg-white rounded-2xl border border-[var(--color-border)] animate-pulse" />
            <div class="h-64 bg-white rounded-2xl border border-[var(--color-border)] animate-pulse" />
          </div>
        </div>
        <div v-else-if="error" class="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl" role="alert">
          <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <circle cx="12" cy="12" r="10" stroke-width="1.75"/>
            <path stroke-linecap="round" stroke-width="1.75" d="M12 8v4M12 16h.01"/>
          </svg>
          <div>
            <p class="text-sm font-semibold text-red-700">API Hatası</p>
            <p class="text-xs text-red-600 mt-0.5">{{ error }}</p>
          </div>
        </div>
        <div
          v-else-if="orders.length === 0"
          class="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-[var(--color-border)] text-center"
        >
          <svg class="w-12 h-12 text-[var(--color-primary-lighter)] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
          </svg>
          <p class="font-semibold text-[var(--color-text-primary)]">Analiz edilecek sipariş bulunamadı</p>
          <p class="text-sm text-[var(--color-text-muted)] mt-1">Seçili aralıkta ({{ shortLabel }}) sipariş bulunamadı. Farklı bir zaman aralığı deneyin.</p>
        </div>
        <OrdersAnalytics v-else :orders="orders" :range-label="shortLabel" />
      </template>

      <!-- ─── ORDERS LIST TAB ─────────────────────────────────────────────────── -->
      <template v-else>

        <!-- Status Filter Pill Bar -->
        <div class="flex items-center gap-1.5 overflow-x-auto py-1.5 scrollbar-none mb-2.5">
          <button
            v-for="opt in statusOptions"
            :key="opt.value"
            type="button"
            :class="[
              'px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-all whitespace-nowrap cursor-pointer',
              status === opt.value
                ? 'bg-[var(--color-primary-lightest)] text-[var(--color-primary)] border-[var(--color-primary-lighter)] shadow-sm'
                : 'bg-white text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-gray-50'
            ]"
            @click="status = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>

        <!-- Filters bar -->
        <div class="bg-white rounded-2xl border border-[var(--color-border)] p-2.5 shadow-sm">
          <div class="flex flex-wrap gap-2.5 items-center">

            <!-- Search input container -->
            <div class="relative flex-1 min-w-[200px]">
              <div class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg class="w-4 h-4 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <circle cx="11" cy="11" r="8" stroke-width="1.75"/>
                  <path stroke-linecap="round" stroke-width="1.75" d="M21 21l-4.35-4.35"/>
                </svg>
              </div>
              <input
                v-model="orderNumber"
                type="text"
                placeholder="Sipariş no veya müşteri ara…"
                class="w-full bg-slate-50 border border-[var(--color-border)] rounded-xl pl-9 pr-4 py-1.5 text-xs font-semibold text-[var(--color-text-primary)] placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-[var(--color-primary)] transition-all outline-none"
                aria-label="Sipariş numarası ara"
              />
            </div>

            <!-- Start Date Picker -->
            <div class="relative min-w-[130px]">
              <div class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg class="w-3.5 h-3.5 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <rect x="3" y="4" width="18" height="18" rx="2" stroke-width="1.75"/>
                  <line x1="16" y1="2" x2="16" y2="6" stroke-width="1.75"/>
                  <line x1="8" y1="2" x2="8" y2="6" stroke-width="1.75"/>
                </svg>
              </div>
              <input
                v-model="startDate"
                type="date"
                class="w-full bg-slate-50 border border-[var(--color-border)] rounded-xl pl-9 pr-3 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-[var(--color-primary)] transition-all outline-none cursor-pointer"
                aria-label="Başlangıç tarihi"
              />
            </div>

            <span class="text-[var(--color-text-muted)] text-xs font-bold">–</span>

            <!-- End Date Picker -->
            <div class="relative min-w-[130px]">
              <div class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg class="w-3.5 h-3.5 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <rect x="3" y="4" width="18" height="18" rx="2" stroke-width="1.75"/>
                  <line x1="16" y1="2" x2="16" y2="6" stroke-width="1.75"/>
                  <line x1="8" y1="2" x2="8" y2="6" stroke-width="1.75"/>
                </svg>
              </div>
              <input
                v-model="endDate"
                type="date"
                class="w-full bg-slate-50 border border-[var(--color-border)] rounded-xl pl-9 pr-3 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-[var(--color-primary)] transition-all outline-none cursor-pointer"
                aria-label="Bitiş tarihi"
              />
            </div>
          </div>
        </div>

        <!-- Error state -->
        <div v-if="error" class="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl" role="alert">
          <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <circle cx="12" cy="12" r="10" stroke-width="1.75"/>
            <path stroke-linecap="round" stroke-width="1.75" d="M12 8v4M12 16h.01"/>
          </svg>
          <div>
            <p class="text-sm font-semibold text-red-700">API Hatası</p>
            <p class="text-xs text-red-600 mt-0.5">{{ error }}</p>
          </div>
        </div>

        <!-- Loading skeleton -->
        <div v-if="isLoading" class="space-y-2">
          <div v-for="i in 8" :key="i" class="h-14 bg-white rounded-xl border border-[var(--color-border)] animate-pulse" />
        </div>

        <!-- Empty orders -->
        <div
          v-else-if="!error && orders.length === 0"
          class="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-[var(--color-border)] text-center"
        >
          <svg class="w-12 h-12 text-[var(--color-primary-lighter)] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
          </svg>
          <p class="font-semibold text-[var(--color-text-primary)]">Sipariş bulunamadı</p>
          <p class="text-sm text-[var(--color-text-muted)] mt-1">Filtrelerinizi değiştirmeyi deneyin</p>
        </div>

        <!-- Orders table -->
        <OrdersTable v-else-if="!isLoading" :orders="paginatedOrders" />

        <!-- Pagination -->
        <div v-if="localTotalPages > 1" class="flex items-center justify-between mt-4">
          <p class="text-xs text-[var(--color-text-muted)]">
            Sayfa {{ localPage + 1 }} / {{ localTotalPages }} · {{ orders.length.toLocaleString('tr-TR') }} sipariş
          </p>
          <nav class="flex items-center gap-1" aria-label="Sayfalama">
            <!-- Prev -->
            <button
              type="button"
              class="w-8 h-8 rounded-lg flex items-center justify-center text-sm text-[var(--color-text-muted)] hover:bg-white hover:text-[var(--color-primary)] border border-transparent hover:border-[var(--color-border)] transition-all disabled:opacity-40"
              :disabled="localPage === 0"
              aria-label="Önceki sayfa"
              @click="goToLocalPage(localPage - 1)"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
            </button>

            <!-- Page numbers -->
            <template v-for="(p, i) in visibleLocalPages" :key="i">
              <span v-if="p === '...'" class="w-8 text-center text-sm text-[var(--color-text-muted)]">…</span>
              <button
                v-else
                type="button"
                class="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium transition-all"
                :class="p === localPage
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:bg-white hover:border border-[var(--color-border)]'"
                :aria-label="`Sayfa ${(p as number) + 1}`"
                :aria-current="p === localPage ? 'page' : undefined"
                @click="goToLocalPage(p as number)"
              >
                {{ (p as number) + 1 }}
              </button>
            </template>

            <!-- Next -->
            <button
              type="button"
              class="w-8 h-8 rounded-lg flex items-center justify-center text-sm text-[var(--color-text-muted)] hover:bg-white hover:text-[var(--color-primary)] border border-transparent hover:border-[var(--color-border)] transition-all disabled:opacity-40"
              :disabled="localPage >= localTotalPages - 1"
              aria-label="Sonraki sayfa"
              @click="goToLocalPage(localPage + 1)"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            </button>
          </nav>
        </div>

    </template>
  </template>
</div>
</template>
