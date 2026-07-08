<script setup lang="ts">
/**
 * pricing/index.vue — Pricing and profit margin analytics dashboard.
 * Features tabs for "Analiz & Grafikler", "Ürün Fiyat Listesi", and "İşlemler".
 * Live pricing updates, single search editors, and Group Update managers integrated.
 */

import { useProducts } from '~/composables/useProducts'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

// Credit system
const { canAfford, spend, balance, CREDIT_COSTS, fetchCredits } = useCredits()

// Helper to sanitize numeric values and prevent NaN spread
function sanitize(val: any, fallback = 0): number {
  if (val === null || val === undefined) return fallback
  const num = Number(val)
  return isNaN(num) ? fallback : num
}

// ─── Store Context ────────────────────────────────────────────────────────────
const client = useSupabaseClient()
const user = useSupabaseUser()
const { data: storesData } = await useAsyncData('pricing-stores', async () => {
  const { data } = await client.from('stores').select('id, store_name, marketplace')
  return data || []
})

const stores = computed(() => storesData.value || [])
const activeStoreId = ref<string>('')

// Initialize active store
onMounted(() => {
  if (stores.value.length > 0) {
    activeStoreId.value = stores.value[0].id
  }
})

// ─── Products Fetching ────────────────────────────────────────────────────────
const {
  products,
  totalElements,
  isLoading,
  error,
  page,
  size,
  searchKeyword,
  fetchProducts,
  resetPage
} = useProducts()

// Re-fetch products when store changes (Immediate triggers initial load)
watch(activeStoreId, () => {
  if (activeStoreId.value) {
    fetchProducts(activeStoreId.value)
    loadLogs()
    loadGroups()
  }
}, { immediate: true })

// Reset page when changing stores/keywords to prevent empty screens
watch([activeStoreId, searchKeyword], () => {
  resetPage()
})

// ─── Page Tabs ────────────────────────────────────────────────────────────────
const activeTab = ref<'analytics' | 'list' | 'actions'>('analytics')

// ─── Metrics & Calculations (Sanitized against NaN) ───────────────────────────
const avgSalePrice = computed(() => {
  if (products.value.length === 0) return 0
  const sum = products.value.reduce((acc, p) => acc + sanitize(p.salePrice, 0), 0)
  return sum / products.value.length
})

const avgCommission = computed(() => {
  if (products.value.length === 0) return 0
  const sum = products.value.reduce((acc, p) => acc + sanitize(p.commissionRate, 15), 0)
  return sum / products.value.length
})

const avgNetYield = computed(() => {
  if (products.value.length === 0) return 0
  const sum = products.value.reduce((acc, p) => {
    const sale = sanitize(p.salePrice, 0)
    const comm = sanitize(p.commissionRate, 15)
    const net = sale * (1 - comm / 100)
    return acc + net
  }, 0)
  return sum / products.value.length
})

const topProfitProducts = computed(() => {
  return [...products.value]
    .map(p => {
      const sale = sanitize(p.salePrice, 0)
      const comm = sanitize(p.commissionRate, 15)
      const netYield = sale * (1 - comm / 100)
      const marginPercentage = sale > 0 ? (netYield / sale) * 100 : 0
      return {
        ...p,
        netYield,
        marginPercentage
      }
    })
    .sort((a, b) => b.netYield - a.netYield)
    .slice(0, 5)
})

const maxNetYield = computed(() => {
  return Math.max(...topProfitProducts.value.map(p => p.netYield), 1)
})

// Slice catalog locally to support pagination while keeping charts calculating on full catalog
const paginatedProducts = computed(() => {
  const start = page.value * size.value
  const end = start + size.value
  return products.value.slice(start, end)
})

// ─── Pagination helpers ───────────────────────────────────────────────────────
const hasPrevPage = computed(() => page.value > 0)
const hasNextPage = computed(() => (page.value + 1) * size.value < totalElements.value)

function nextPage() {
  if (hasNextPage.value) page.value++
}

function prevPage() {
  if (hasPrevPage.value) page.value--
}

// ─── Log History — Resilient Supabase & LocalStorage Fallback Sync ──────────
interface PriceLog {
  id: string
  date: string
  title: string
  barcode: string
  type: 'Bireysel' | 'Toplu'
  oldPrice: number
  newPrice: number
  status: string
}

const priceLogs = ref<PriceLog[]>([])

async function loadLogs() {
  if (!activeStoreId.value) return
  try {
    const { data, error: dbErr } = await client
      .from('price_logs')
      .select('*')
      .eq('store_id', activeStoreId.value)
      .order('created_at', { ascending: false })

    if (dbErr) throw dbErr
    priceLogs.value = (data || []).map(row => {
      let formattedDate = row.date
      if (row.created_at) {
        const d = new Date(row.created_at)
        const timeStr = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
        const dateStr = d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })
        formattedDate = `${timeStr} ${dateStr}`
      }
      return {
        id: row.id,
        date: formattedDate,
        title: row.title,
        barcode: row.barcode,
        type: row.type as 'Bireysel' | 'Toplu',
        oldPrice: sanitize(row.old_price),
        newPrice: sanitize(row.new_price),
        status: row.status
      }
    })
  } catch (err: any) {
    // Graceful fallback to LocalStorage if Supabase table is not generated yet
    console.warn('[Price Logs] DB table not found or offline. Using localStorage fallback:', err.message)
    const local = localStorage.getItem(`price_logs_${activeStoreId.value}`)
    priceLogs.value = local ? JSON.parse(local) : []
  }
}

async function addLog(log: Omit<PriceLog, 'id' | 'date'>) {
  const newLogEntry: PriceLog = {
    id: `log-${Date.now()}`,
    date: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }),
    title: log.title,
    barcode: log.barcode,
    type: log.type,
    oldPrice: log.oldPrice,
    newPrice: log.newPrice,
    status: log.status
  }

  try {
    const { error: dbErr } = await client.from('price_logs').insert({
      user_id: user.value?.id,
      store_id: activeStoreId.value,
      date: newLogEntry.date,
      title: newLogEntry.title,
      barcode: newLogEntry.barcode,
      type: newLogEntry.type,
      old_price: newLogEntry.oldPrice,
      new_price: newLogEntry.newPrice,
      status: newLogEntry.status
    })

    if (dbErr) throw dbErr
    priceLogs.value.unshift(newLogEntry)
  } catch (err: any) {
    console.warn('[Price Logs] Failed writing to database, saving in localStorage:', err.message)
    priceLogs.value.unshift(newLogEntry)
    localStorage.setItem(`price_logs_${activeStoreId.value}`, JSON.stringify(priceLogs.value))
  }
}

// ─── Modal State: Edit Product ───────────────────────────────────────────────
const isEditModalOpen = ref(false)
const editingProduct = ref<any>(null)
const newSalePrice = ref<number>(0)
const newListPrice = ref<number>(0)
const isUpdating = ref(false)

function openEditModal(product: any) {
  editingProduct.value = product
  newSalePrice.value = sanitize(product.salePrice, 0)
  newListPrice.value = sanitize(product.listPrice, 0)
  isEditModalOpen.value = true
}

function closeEditModal() {
  isEditModalOpen.value = false
  editingProduct.value = null
}

async function handleUpdatePrice() {
  if (!editingProduct.value || !activeStoreId.value) return

  // Credit check
  if (!canAfford('single_edit')) {
    alert(`Yetersiz kredi! Tekil ürün düzenlemesi için ${CREDIT_COSTS.single_edit} kredi gereklidir. Mevcut bakiye: ${balance.value} kredi.`)
    closeEditModal()
    return
  }

  isUpdating.value = true
  
  const oldSale = sanitize(editingProduct.value.salePrice, 0)

  try {
    // Send live update to Trendyol API Proxy
    const response = await $fetch<any>('/api/trendyol/price-update', {
      method: 'POST',
      body: {
        storeId: activeStoreId.value,
        updateType: 'single',
        items: [{
          barcode: editingProduct.value.barcode,
          salePrice: newSalePrice.value,
          listPrice: newListPrice.value,
          quantity: editingProduct.value.quantity
        }]
      }
    })

    if (response.success) {
      // Update locally
      const prod = products.value.find(p => p.barcode === editingProduct.value.barcode)
      if (prod) {
        prod.salePrice = newSalePrice.value
        prod.listPrice = newListPrice.value
      }

      // Deduct credits
      await fetchCredits()

      // Add log
      await addLog({
        title: editingProduct.value.title,
        barcode: editingProduct.value.barcode,
        type: 'Bireysel',
        oldPrice: oldSale,
        newPrice: newSalePrice.value,
        status: 'approved'
      })

      alert(`Fiyat güncellendi ve Trendyol'a gönderildi. (Talep ID: ${response.batchRequestId})`)
    }
  } catch (err: any) {
    alert(`Trendyol API güncelleme hatası: ${err.statusMessage || err.message}`)
  } finally {
    isUpdating.value = false
    closeEditModal()
  }
}

// ─── Operations Tab States: Single vs Bulk vs Group ──────────────────────────
const actionMode = ref<'bulk' | 'single' | 'group'>('bulk')

// Bulk Operations
const bulkOp = ref<'increase' | 'decrease'>('increase')
const bulkType = ref<'percent' | 'fixed'>('percent')
const bulkValue = ref<number>(10)
const isBulkUpdating = ref(false)

async function handleBulkApply() {
  if (products.value.length === 0 || !bulkValue.value || !activeStoreId.value) return

  // Credit check
  if (!canAfford('bulk_update')) {
    alert(`Yetersiz kredi! Toplu fiyat güncelleme için ${CREDIT_COSTS.bulk_update} kredi gereklidir. Mevcut bakiye: ${balance.value} kredi.`)
    return
  }
  
  const confirmMsg = `Dikkat! Mağazadaki tüm (${products.value.length}) ürünlerin fiyatı güncellenecektir. Bu işlem ${CREDIT_COSTS.bulk_update} kredi düşecektir. Devam etmek istiyor musunuz?`
  if (!confirm(confirmMsg)) return

  isBulkUpdating.value = true
  const oldAverage = avgSalePrice.value
  const count = products.value.length

  const updatedItems = products.value.map(p => {
    const currentPrice = sanitize(p.salePrice, 0)
    const currentList = sanitize(p.listPrice, 0)
    let change = 0
    if (bulkType.value === 'percent') {
      change = currentPrice * (bulkValue.value / 100)
    } else {
      change = bulkValue.value
    }

    let newSale = currentPrice
    let newList = currentList

    if (bulkOp.value === 'increase') {
      newSale = Math.round(currentPrice + change)
      newList = Math.round(currentList + change)
    } else {
      newSale = Math.max(1, Math.round(currentPrice - change))
      newList = Math.max(1, Math.round(currentList - change))
    }

    return {
      barcode: p.barcode,
      salePrice: newSale,
      listPrice: newList,
      quantity: p.quantity
    }
  })

  try {
    // Send live bulk price update to Trendyol
    const response = await $fetch<any>('/api/trendyol/price-update', {
      method: 'POST',
      body: {
        storeId: activeStoreId.value,
        updateType: 'bulk',
        items: updatedItems
      }
    })

    if (response.success) {
      // Apply changes locally
      updatedItems.forEach(item => {
        const prod = products.value.find(p => p.barcode === item.barcode)
        if (prod) {
          prod.salePrice = item.salePrice
          prod.listPrice = item.listPrice
        }
      })

      // Deduct credits
      await fetchCredits()

      // Add log
      await addLog({
        title: `Toplu Fiyat Güncelleme (${count} Ürün)`,
        barcode: 'Tüm Varyantlar',
        type: 'Toplu',
        oldPrice: oldAverage,
        newPrice: avgSalePrice.value,
        status: 'approved'
      })

      alert(`Toplu güncelleme talebi Trendyol'a gönderildi. (Talep ID: ${response.batchRequestId})`)
    }
  } catch (err: any) {
    alert(`Toplu fiyat güncelleme hatası: ${err.statusMessage || err.message}`)
  } finally {
    isBulkUpdating.value = false
  }
}

// Single Inline Operations via Search
const singleSearchQuery = ref('')
const selectedSingleProduct = ref<any>(null)
const singleNewSalePrice = ref<number>(0)
const singleNewListPrice = ref<number>(0)

const searchResults = computed(() => {
  if (!singleSearchQuery.value.trim()) return []
  const q = singleSearchQuery.value.toLowerCase().trim()
  return products.value.filter(p => {
    const title = (p.title || '').toLowerCase()
    const barcode = (p.barcode || '').toLowerCase()
    const stockCode = (p.stockCode || '').toLowerCase()
    return title.includes(q) || barcode.includes(q) || stockCode.includes(q)
  }).slice(0, 100)
})

function selectProduct(prod: any) {
  selectedSingleProduct.value = prod
  singleNewSalePrice.value = sanitize(prod.salePrice, 0)
  singleNewListPrice.value = sanitize(prod.listPrice, 0)
  singleSearchQuery.value = ''
}

async function handleSingleApply() {
  if (!selectedSingleProduct.value || !activeStoreId.value) return

  // Credit check
  if (!canAfford('single_edit')) {
    alert(`Yetersiz kredi! Tekil ürün düzenlemesi için ${CREDIT_COSTS.single_edit} kredi gereklidir. Mevcut bakiye: ${balance.value} kredi.`)
    return
  }

  isUpdating.value = true

  const oldSale = sanitize(selectedSingleProduct.value.salePrice, 0)

  try {
    const response = await $fetch<any>('/api/trendyol/price-update', {
      method: 'POST',
      body: {
        storeId: activeStoreId.value,
        updateType: 'single',
        items: [{
          barcode: selectedSingleProduct.value.barcode,
          salePrice: singleNewSalePrice.value,
          listPrice: singleNewListPrice.value,
          quantity: selectedSingleProduct.value.quantity
        }]
      }
    })

    if (response.success) {
      // Update locally
      const prod = products.value.find(p => p.barcode === selectedSingleProduct.value.barcode)
      if (prod) {
        prod.salePrice = singleNewSalePrice.value
        prod.listPrice = singleNewListPrice.value
      }

      // Deduct credits
      await fetchCredits()

      // Add log
      await addLog({
        title: selectedSingleProduct.value.title,
        barcode: selectedSingleProduct.value.barcode,
        type: 'Bireysel',
        oldPrice: oldSale,
        newPrice: singleNewSalePrice.value,
        status: 'approved'
      })

      alert(`Fiyat güncellendi ve Trendyol'a gönderildi. (Talep ID: ${response.batchRequestId})`)
      selectedSingleProduct.value = null
    }
  } catch (err: any) {
    alert(`Trendyol API güncelleme hatası: ${err.statusMessage || err.message}`)
  } finally {
    isUpdating.value = false
  }
}

// ─── Group Operations States & Logic (NEW) ──────────────────────────────────
const groups = ref<Array<{ id: string, name: string, barcodes: string[] }>>([])
const activeGroupId = ref<string>('')
const isCreatingGroup = ref(false)
const newGroupName = ref('')
const newGroupBarcodes = ref<string[]>([])
const groupProductSearchQuery = ref('')

const activeGroupProducts = computed(() => {
  const activeGroup = groups.value.find(g => g.id === activeGroupId.value)
  if (!activeGroup) return []
  return products.value.filter(p => activeGroup.barcodes.includes(p.barcode))
})

const groupSearchProducts = computed(() => {
  if (!groupProductSearchQuery.value.trim()) return []
  const q = groupProductSearchQuery.value.toLowerCase().trim()
  return products.value.filter(p => {
    if (newGroupBarcodes.value.includes(p.barcode)) return false
    const title = (p.title || '').toLowerCase()
    const barcode = (p.barcode || '').toLowerCase()
    const stockCode = (p.stockCode || '').toLowerCase()
    return title.includes(q) || barcode.includes(q) || stockCode.includes(q)
  }).slice(0, 5)
})

function addToGroup(barcode: string) {
  if (!newGroupBarcodes.value.includes(barcode)) {
    newGroupBarcodes.value.push(barcode)
  }
  groupProductSearchQuery.value = ''
}

function removeFromGroup(barcode: string) {
  newGroupBarcodes.value = newGroupBarcodes.value.filter(b => b !== barcode)
}

function getProductByBarcode(barcode: string) {
  return products.value.find(p => p.barcode === barcode)
}

async function saveGroup() {
  if (!newGroupName.value.trim() || newGroupBarcodes.value.length === 0) {
    alert('Lütfen grup adı girin ve en az bir ürün ekleyin!')
    return
  }

  const newGroup = {
    id: `group-${Date.now()}`,
    name: newGroupName.value.trim(),
    barcodes: [...newGroupBarcodes.value]
  }

  try {
    const { error: dbErr } = await client.from('product_groups').insert({
      user_id: user.value?.id,
      store_id: activeStoreId.value,
      name: newGroup.name,
      barcodes: newGroup.barcodes
    })

    if (dbErr) throw dbErr
    groups.value.unshift(newGroup)
    alert(`"${newGroup.name}" grubu başarıyla kaydedildi.`)
  } catch (err: any) {
    console.warn('[Groups] Failed saving to DB, using LocalStorage fallback:', err.message)
    groups.value.unshift(newGroup)
    localStorage.setItem(`product_groups_${activeStoreId.value}`, JSON.stringify(groups.value))
    alert(`"${newGroup.name}" grubu tarayıcı hafızasına (LocalStorage) kaydedildi. (Mağaza veri tabanına daha sonra kaydedilecektir)`)
  }

  activeGroupId.value = newGroup.id
  newGroupName.value = ''
  newGroupBarcodes.value = []
  isCreatingGroup.value = false
}

async function deleteGroup(id: string) {
  if (!confirm('Bu grubu silmek istediğinizden emin misiniz?')) return

  try {
    const { error: dbErr } = await client.from('product_groups').delete().eq('id', id)
    if (dbErr) throw dbErr
    groups.value = groups.value.filter(g => g.id !== id)
  } catch (err: any) {
    console.warn('[Groups] Failed deleting from DB, using LocalStorage fallback:', err.message)
    groups.value = groups.value.filter(g => g.id !== id)
    localStorage.setItem(`product_groups_${activeStoreId.value}`, JSON.stringify(groups.value))
  }

  if (activeGroupId.value === id) {
    activeGroupId.value = groups.value.length > 0 ? groups.value[0].id : ''
  }
}

async function loadGroups() {
  if (!activeStoreId.value) return
  
  // Baseline load from LocalStorage first
  const local = localStorage.getItem(`product_groups_${activeStoreId.value}`)
  const localGroups = local ? JSON.parse(local) : []

  try {
    const { data, error: dbErr } = await client
      .from('product_groups')
      .select('*')
      .eq('store_id', activeStoreId.value)

    if (dbErr) throw dbErr
    const dbGroups = (data || []).map(row => ({
      id: row.id,
      name: row.name,
      barcodes: row.barcodes || []
    }))

    // Use database groups if any are found, otherwise fall back to local groups
    if (dbGroups.length > 0) {
      groups.value = dbGroups
    } else {
      groups.value = localGroups
    }
  } catch (err: any) {
    console.warn('[Groups] DB table query failed, fallback to LocalStorage:', err.message)
    groups.value = localGroups
  }

  if (groups.value.length > 0 && !activeGroupId.value) {
    activeGroupId.value = groups.value[0].id
  }
}

// Group Bulk Pricing Apply
const groupBulkOp = ref<'increase' | 'decrease'>('increase')
const groupBulkType = ref<'percent' | 'fixed'>('percent')
const groupBulkValue = ref<number>(10)
const isGroupUpdating = ref(false)

async function handleGroupBulkApply() {
  const activeGroup = groups.value.find(g => g.id === activeGroupId.value)
  if (!activeGroup || activeGroupProducts.value.length === 0 || !groupBulkValue.value || !activeStoreId.value) return

  // Credit check
  if (!canAfford('group_update')) {
    alert(`Yetersiz kredi! Grup fiyat güncelleme için ${CREDIT_COSTS.group_update} kredi gereklidir. Mevcut bakiye: ${balance.value} kredi.`)
    return
  }

  isGroupUpdating.value = true
  const count = activeGroupProducts.value.length
  
  // Calculate average of the group before change
  const groupPricesSum = activeGroupProducts.value.reduce((acc, p) => acc + sanitize(p.salePrice, 0), 0)
  const oldAverage = groupPricesSum / count

  const updatedItems = activeGroupProducts.value.map(p => {
    const currentPrice = sanitize(p.salePrice, 0)
    const currentList = sanitize(p.listPrice, 0)
    let change = 0
    if (groupBulkType.value === 'percent') {
      change = currentPrice * (groupBulkValue.value / 100)
    } else {
      change = groupBulkValue.value
    }

    let newSale = currentPrice
    let newList = currentList

    if (groupBulkOp.value === 'increase') {
      newSale = Math.round(currentPrice + change)
      newList = Math.round(currentList + change)
    } else {
      newSale = Math.max(1, Math.round(currentPrice - change))
      newList = Math.max(1, Math.round(currentList - change))
    }

    return {
      barcode: p.barcode,
      salePrice: newSale,
      listPrice: newList,
      quantity: p.quantity
    }
  })

  try {
    // Send live group update to Trendyol API Proxy
    const response = await $fetch<any>('/api/trendyol/price-update', {
      method: 'POST',
      body: {
        storeId: activeStoreId.value,
        updateType: 'group',
        items: updatedItems
      }
    })

    if (response.success) {
      // Apply updates locally
      updatedItems.forEach(item => {
        const prod = products.value.find(p => p.barcode === item.barcode)
        if (prod) {
          prod.salePrice = item.salePrice
          prod.listPrice = item.listPrice
        }
      })

      // Deduct credits
      await fetchCredits()

      // Add log
      const newAverage = activeGroupProducts.value.reduce((acc, p) => acc + sanitize(p.salePrice, 0), 0) / count
      await addLog({
        title: `Grup Fiyat Güncelleme (${activeGroup.name} - ${count} Ürün)`,
        barcode: 'Grup Varyantları',
        type: 'Toplu',
        oldPrice: oldAverage,
        newPrice: newAverage,
        status: 'approved'
      })

      alert(`Grup fiyat güncelleme talebi Trendyol'a gönderildi. (Talep ID: ${response.batchRequestId})`)
    }
  } catch (err: any) {
    alert(`Grup toplu güncelleme hatası: ${err.statusMessage || err.message}`)
  } finally {
    isGroupUpdating.value = false
  }
}

// Refresh Catalog Trigger
function handleRefresh() {
  if (activeStoreId.value) {
    fetchProducts(activeStoreId.value)
    loadLogs()
    loadGroups()
  }
}

// ─── Formatting helpers ───────────────────────────────────────────────────────
function formatCurrency(val: number): string {
  const cleanVal = sanitize(val, 0)
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0
  }).format(cleanVal)
}
</script>

<template>
  <main class="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">

    <!-- ─── Header ─── -->
    <header class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-xl font-black text-[var(--color-text-primary)] tracking-tight">Fiyatlandırma & Kâr Analizi</h1>
        <p class="text-xs text-[var(--color-text-muted)] mt-1">Trendyol ürünlerinizin fiyatlarını, komisyon ve kâr marjlarını analiz edin.</p>
      </div>

      <!-- Refresh Catalog Button -->
      <div v-if="stores.length > 0" class="flex items-center gap-2">
        <button
          type="button"
          class="w-9 h-9 rounded-xl bg-white border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary-lighter)] transition-all cursor-pointer"
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
    </header>

    <!-- Fallback if no store registered -->
    <div
      v-if="stores.length === 0"
      class="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-[var(--color-border)] text-center p-6"
    >
      <svg class="w-12 h-12 text-[var(--color-primary-lighter)] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <circle cx="12" cy="12" r="10" stroke-width="1.5"/><line x1="12" y1="8" x2="12" y2="12" stroke-width="1.5"/><line x1="12" y1="16" x2="12.01" y2="16" stroke-width="1.5"/>
      </svg>
      <p class="font-bold text-[var(--color-text-primary)]">Kayıtlı mağaza bulunamadı</p>
      <p class="text-xs text-[var(--color-text-muted)] mt-1 mb-4">Fiyat analizi yapabilmek için öncelikle mağazanızı bağlamanız gerekir.</p>
      <NuxtLink to="/dashboard" class="btn-primary py-2 px-4 text-xs font-bold rounded-xl">Mağaza Bağla</NuxtLink>
    </div>

    <template v-else>
      <!-- ─── Tabs Navigation ─── -->
      <div class="flex border-b border-[var(--color-border)]">
        <button
          type="button"
          :class="[
            'px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer',
            activeTab === 'analytics'
              ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)] font-black'
              : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]',
          ]"
          @click="activeTab = 'analytics'"
        >
          Analiz & Grafikler
        </button>
        <button
          type="button"
          :class="[
            'px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer',
            activeTab === 'list'
              ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)] font-black'
              : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]',
          ]"
          @click="activeTab = 'list'"
        >
          Ürün Fiyat Listesi
        </button>
        <button
          type="button"
          :class="[
            'px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer',
            activeTab === 'actions'
              ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)] font-black'
              : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]',
          ]"
          @click="activeTab = 'actions'"
        >
          İşlemler
        </button>
      </div>

      <!-- ─── Loading / Error states ─── -->
      <div v-if="isLoading" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div v-for="i in 3" :key="i" class="h-24 bg-white rounded-2xl border border-[var(--color-border)] animate-pulse" />
        </div>
        <div class="h-64 bg-white rounded-2xl border border-[var(--color-border)] animate-pulse" />
      </div>

      <div v-else-if="error" class="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl" role="alert">
        <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <circle cx="12" cy="12" r="10" stroke-width="1.75"/><path stroke-linecap="round" stroke-width="1.75" d="M12 8v4M12 16h.01"/>
        </svg>
        <div>
          <p class="text-sm font-semibold text-red-700">Ürün Yükleme Hatası</p>
          <p class="text-xs text-red-600 mt-0.5">{{ error }}</p>
        </div>
      </div>

      <div v-else-if="products.length === 0" class="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-[var(--color-border)] text-center">
        <svg class="w-12 h-12 text-[var(--color-primary-lighter)] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"/>
        </svg>
        <p class="font-bold text-[var(--color-text-primary)]">Mağazada ürün bulunamadı</p>
        <p class="text-xs text-[var(--color-text-muted)] mt-1">Trendyol API'nizden hiçbir ürün çekilemedi veya mağazanız boş.</p>
      </div>

      <!-- ─── Tab Content: ANALYTICS ─── -->
      <template v-else-if="activeTab === 'analytics'">
        <div class="space-y-6 animate-in fade-in duration-350">
          <!-- KPI Cards -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            <div class="metric-card bg-white p-5 rounded-2xl border border-[var(--color-border)] shadow-sm">
              <span class="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block mb-2">Ortalama Satış Fiyatı</span>
              <p class="text-2xl font-black text-[var(--color-text-primary)]">{{ formatCurrency(avgSalePrice) }}</p>
              <p class="text-[10px] text-[var(--color-text-muted)] mt-1">Tüm aktif ürünlerin fiyat ortalaması</p>
            </div>

            <div class="metric-card bg-white p-5 rounded-2xl border border-[var(--color-border)] shadow-sm">
              <span class="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block mb-2">Ortalama Komisyon Oranı</span>
              <p class="text-2xl font-black text-blue-600">%{{ Math.round(avgCommission) }}</p>
              <p class="text-[10px] text-[var(--color-text-muted)] mt-1">Kategori bazlı ortalama kesinti</p>
            </div>

            <div class="metric-card bg-white p-5 rounded-2xl border border-[var(--color-border)] shadow-sm">
              <span class="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block mb-2">Tahmini Ortalama Hakediş</span>
              <p class="text-2xl font-black text-emerald-600">{{ formatCurrency(avgNetYield) }}</p>
              <p class="text-[10px] text-[var(--color-text-muted)] mt-1">Komisyon sonrası ele geçecek tutar</p>
            </div>

          </div>

          <!-- Charts Grid -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

            <!-- Chart 1: En Karlı Ürünler -->
            <div class="bg-white rounded-2xl border border-[var(--color-border)] p-5 shadow-sm flex flex-col justify-between">
              <div>
                <h3 class="text-sm font-bold text-[var(--color-text-primary)]">En Yüksek Getirili 5 Ürün</h3>
                <p class="text-xs text-[var(--color-text-muted)] mt-0.5">Komisyon sonrası kalan net tutara göre</p>
              </div>

              <div class="my-6 space-y-4">
                <div v-for="prod in topProfitProducts" :key="prod.barcode" class="space-y-1.5 group">
                  <div class="flex items-center justify-between text-xs font-semibold gap-3">
                    <span class="text-[var(--color-text-secondary)] truncate flex-1 group-hover:text-[var(--color-primary)] transition-colors" :title="prod.title">
                      {{ prod.title }}
                    </span>
                    <span class="text-[var(--color-text-primary)] whitespace-nowrap">{{ formatCurrency(prod.netYield) }}</span>
                  </div>
                  <!-- Progress bar showing net yield relative to highest -->
                  <div class="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all duration-300"
                      :style="`width: ${(prod.netYield / maxNetYield) * 100}%; background: var(--color-primary);`"
                    />
                  </div>
                  <div class="flex justify-between text-[9px] text-[var(--color-text-muted)] font-medium">
                    <span>Satış: {{ formatCurrency(prod.salePrice) }}</span>
                    <span>Hakediş Oranı: %{{ Math.round(prod.marginPercentage) }}</span>
                  </div>
                </div>
              </div>

              <div class="text-[9px] text-center text-[var(--color-text-muted)] border-t border-gray-50 pt-2 font-medium">
                Komisyon oranına göre hakedişi en yüksek ürünlerdir.
              </div>
            </div>

            <!-- Chart 2: Fiyat Aralık Dağılımı -->
            <div class="lg:col-span-2 bg-white rounded-2xl border border-[var(--color-border)] p-5 shadow-sm flex flex-col justify-between">
              <div>
                <h3 class="text-sm font-bold text-[var(--color-text-primary)]">Fiyat Dağılım Grafiği</h3>
                <p class="text-xs text-[var(--color-text-muted)] mt-0.5">Ürünlerin hangi fiyat aralıklarında yoğunlaştığı</p>
              </div>

              <!-- Bar Chart showing price distribution groups -->
              <div class="my-6 flex items-end justify-around h-36 border-b border-gray-100 pb-2 px-4">
                <!-- Group 1: 0 - 500 TL -->
                <div class="flex flex-col items-center w-16 group cursor-pointer">
                  <div class="text-[10px] font-bold text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity mb-1">
                    {{ products.filter(p => sanitize(p.salePrice) <= 500).length }} Ürün
                  </div>
                  <div
                    class="w-8 rounded-t bg-blue-400 group-hover:bg-blue-600 transition-colors"
                    :style="`height: ${Math.max(10, (products.filter(p => sanitize(p.salePrice) <= 500).length / Math.max(products.length, 1)) * 100)}px`"
                  />
                  <span class="text-[9px] font-bold text-gray-400 mt-2">0 - 500 TL</span>
                </div>

                <!-- Group 2: 500 - 1500 TL -->
                <div class="flex flex-col items-center w-16 group cursor-pointer">
                  <div class="text-[10px] font-bold text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity mb-1">
                    {{ products.filter(p => sanitize(p.salePrice) > 500 && sanitize(p.salePrice) <= 1500).length }} Ürün
                  </div>
                  <div
                    class="w-8 rounded-t bg-blue-500 group-hover:bg-blue-700 transition-colors"
                    :style="`height: ${Math.max(10, (products.filter(p => sanitize(p.salePrice) > 500 && sanitize(p.salePrice) <= 1500).length / Math.max(products.length, 1)) * 100)}px`"
                  />
                  <span class="text-[9px] font-bold text-gray-400 mt-2">500-1500 TL</span>
                </div>

                <!-- Group 3: 1500 - 3000 TL -->
                <div class="flex flex-col items-center w-16 group cursor-pointer">
                  <div class="text-[10px] font-bold text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity mb-1">
                    {{ products.filter(p => sanitize(p.salePrice) > 1500 && sanitize(p.salePrice) <= 3000).length }} Ürün
                  </div>
                  <div
                    class="w-8 rounded-t bg-blue-600 group-hover:bg-blue-800 transition-colors"
                    :style="`height: ${Math.max(10, (products.filter(p => sanitize(p.salePrice) > 1500 && sanitize(p.salePrice) <= 3000).length / Math.max(products.length, 1)) * 100)}px`"
                  />
                  <span class="text-[9px] font-bold text-gray-400 mt-2">1.5k-3k TL</span>
                </div>

                <!-- Group 4: 3000+ TL -->
                <div class="flex flex-col items-center w-16 group cursor-pointer">
                  <div class="text-[10px] font-bold text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity mb-1">
                    {{ products.filter(p => sanitize(p.salePrice) > 3000).length }} Ürün
                  </div>
                  <div
                    class="w-8 rounded-t bg-blue-700 group-hover:bg-blue-900 transition-colors"
                    :style="`height: ${Math.max(10, (products.filter(p => sanitize(p.salePrice) > 3000).length / Math.max(products.length, 1)) * 100)}px`"
                  />
                  <span class="text-[9px] font-bold text-gray-400 mt-2">3000 TL+</span>
                </div>
              </div>

              <div class="flex items-center justify-between text-[10px] text-[var(--color-text-muted)] border-t border-gray-50 pt-2 px-1 font-medium">
                <span>Mağazada toplam {{ products.length }} farklı fiyatlı varyant bulunmaktadır.</span>
                <span>Fiyatlar KDV dahildir</span>
              </div>
            </div>

          </div>
        </div>
      </template>

      <!-- ─── Tab Content: PRODUCT PRICE LIST ─── -->
      <template v-else-if="activeTab === 'list'">
        <!-- Filter bar -->
        <div class="flex gap-4 items-center bg-white rounded-2xl border border-[var(--color-border)] p-2.5 shadow-sm mb-4 animate-in fade-in duration-350">
          <!-- Search input container -->
          <div class="relative flex-1">
            <div class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg class="w-4 h-4 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="11" cy="11" r="8" stroke-width="1.75"/>
                <path stroke-linecap="round" stroke-width="1.75" d="M21 21l-4.35-4.35"/>
              </svg>
            </div>
            <input
              v-model="searchKeyword"
              type="text"
              placeholder="Ürün adı, barkod veya SKU ara…"
              class="w-full bg-slate-50 border border-[var(--color-border)] rounded-xl pl-9 pr-4 py-1.5 text-xs font-semibold text-[var(--color-text-primary)] placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-[var(--color-primary)] transition-all outline-none"
              aria-label="Ürün ara"
            />
          </div>
        </div>

        <!-- Pricing Table -->
        <div class="bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden shadow-sm animate-in fade-in duration-350">
          <table class="w-full text-sm" aria-label="Ürün fiyat tablosu">
            <thead>
              <tr class="bg-[#F8FAFF] border-b border-[var(--color-border)]">
                <th class="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Ürün Bilgisi</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Barkod / SKU</th>
                <th class="px-4 py-3 text-right text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Liste Fiyatı</th>
                <th class="px-4 py-3 text-right text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Satış Fiyatı</th>
                <th class="px-4 py-3 text-center text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Komisyon</th>
                <th class="px-4 py-3 text-right text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Net Hakediş</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="prod in paginatedProducts"
                :key="prod.barcode"
                class="border-b border-[var(--color-border)] hover:bg-[#F8FAFF] transition-colors"
              >
                <!-- Title & Image -->
                <td class="px-4 py-3.5 max-w-[280px]">
                  <div class="flex items-center gap-3">
                    <img
                      v-if="prod.images && prod.images[0]"
                      :src="prod.images[0].url"
                      alt=""
                      class="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-gray-100"
                    />
                    <div v-else class="w-10 h-10 rounded-lg bg-[var(--color-primary-lightest)] text-[var(--color-primary-lighter)] flex items-center justify-center flex-shrink-0">
                      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"/>
                      </svg>
                    </div>
                    <div class="min-w-0">
                      <p class="font-medium text-[var(--color-text-primary)] text-sm truncate" :title="prod.title">
                        {{ prod.title }}
                      </p>
                    </div>
                  </div>
                </td>

                <!-- Barcode & SKU -->
                <td class="px-4 py-3.5 text-xs text-[var(--color-text-secondary)] whitespace-nowrap font-mono">
                  <p>{{ prod.barcode }}</p>
                  <p class="text-[10px] text-[var(--color-text-muted)] mt-0.5">{{ prod.stockCode }}</p>
                </td>

                <!-- List price -->
                <td class="px-4 py-3.5 text-right text-xs text-[var(--color-text-muted)] font-semibold line-through">
                  {{ formatCurrency(sanitize(prod.listPrice)) }}
                </td>

                <!-- Sale price -->
                <td class="px-4 py-3.5 text-right text-sm text-[var(--color-text-primary)] font-bold">
                  {{ formatCurrency(sanitize(prod.salePrice)) }}
                </td>

                <!-- Commission Rate -->
                <td class="px-4 py-3.5 text-center text-xs font-semibold text-blue-600">
                  %{{ sanitize(prod.commissionRate, 15) }}
                </td>

                <!-- Net yield -->
                <td class="px-4 py-3.5 text-right text-sm text-emerald-600 font-black">
                  {{ formatCurrency(sanitize(prod.salePrice, 0) * (1 - sanitize(prod.commissionRate, 15) / 100)) }}
                </td>
              </tr>
            </tbody>
          </table>

          <!-- ─── PAGINATION BAR ─── -->
          <div class="flex items-center justify-between border-t border-[var(--color-border)] px-4 py-3 bg-gray-50 text-xs">
            <div class="text-[var(--color-text-muted)] font-semibold">
              Toplam {{ totalElements }} üründen {{ page * size + 1 }} - {{ Math.min((page + 1) * size, totalElements) }} arası gösteriliyor
            </div>
            <div class="flex gap-2">
              <button
                type="button"
                :disabled="!hasPrevPage"
                class="px-3 py-1.5 font-bold rounded-lg border border-[var(--color-border)] bg-white text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                @click="prevPage"
              >
                Önceki
              </button>
              <button
                type="button"
                :disabled="!hasNextPage"
                class="px-3 py-1.5 font-bold rounded-lg border border-[var(--color-border)] bg-white text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                @click="nextPage"
              >
                Sonraki
              </button>
            </div>
          </div>

        </div>
      </template>

      <!-- ─── Tab Content: ACTIONS ─── -->
      <template v-else-if="activeTab === 'actions'">
        <div class="space-y-6 animate-in fade-in duration-350">
          
          <!-- Upper Grid: Forms and Controls -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <!-- Left Side: Interactive Sidebar Menu -->
            <div class="space-y-3">
              <div class="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider pl-1 mb-2">İşlem Modu</div>
              
              <!-- Bulk Menu Card -->
              <button
                type="button"
                :class="[
                  'w-full text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex items-start gap-3.5',
                  actionMode === 'bulk'
                    ? 'bg-white border-[var(--color-primary)] shadow-md ring-2 ring-blue-50'
                    : 'bg-white border-[var(--color-border)] hover:border-[var(--color-primary-lighter)] shadow-sm hover:shadow'
                ]"
                @click="actionMode = 'bulk'; selectedSingleProduct = null;"
              >
                <div :class="['p-2.5 rounded-xl flex-shrink-0', actionMode === 'bulk' ? 'bg-blue-50 text-[var(--color-primary)]' : 'bg-slate-50 text-gray-400']">
                  <!-- Bulk Icon -->
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                  </svg>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between gap-1.5">
                    <h4 class="text-xs font-extrabold text-slate-800">Toplu Fiyat Güncelleme</h4>
                    <span class="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100 flex-shrink-0">30 Kredi</span>
                  </div>
                  <p class="text-[10px] text-[var(--color-text-muted)] mt-1 font-medium leading-relaxed">
                    Mağazadaki tüm ürünlerin fiyatlarını belirli bir yüzde veya sabit tutarla topluca değiştirin.
                  </p>
                </div>
              </button>

              <!-- Single Menu Card -->
              <button
                type="button"
                :class="[
                  'w-full text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex items-start gap-3.5',
                  actionMode === 'single'
                    ? 'bg-white border-[var(--color-primary)] shadow-md ring-2 ring-blue-50'
                    : 'bg-white border-[var(--color-border)] hover:border-[var(--color-primary-lighter)] shadow-sm hover:shadow'
                ]"
                @click="actionMode = 'single'"
              >
                <div :class="['p-2.5 rounded-xl flex-shrink-0', actionMode === 'single' ? 'bg-blue-50 text-[var(--color-primary)]' : 'bg-slate-50 text-gray-400']">
                  <!-- Search Icon -->
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <circle cx="11" cy="11" r="8" stroke-width="1.75"/><path stroke-linecap="round" stroke-width="1.75" d="M21 21l-4.35-4.35"/>
                  </svg>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between gap-1.5">
                    <h4 class="text-xs font-extrabold text-slate-800">Tekil Ürün Düzenleme</h4>
                    <span class="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100 flex-shrink-0">0.5 Kredi</span>
                  </div>
                  <p class="text-[10px] text-[var(--color-text-muted)] mt-1 font-medium leading-relaxed">
                    Barkod, SKU veya ürün adı ile arama yaparak sadece seçtiğiniz bir ürünün fiyatını değiştirin.
                  </p>
                </div>
              </button>

              <!-- Group Menu Card -->
              <button
                type="button"
                :class="[
                  'w-full text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex items-start gap-3.5',
                  actionMode === 'group'
                    ? 'bg-white border-[var(--color-primary)] shadow-md ring-2 ring-blue-50'
                    : 'bg-white border-[var(--color-border)] hover:border-[var(--color-primary-lighter)] shadow-sm hover:shadow'
                ]"
                @click="actionMode = 'group'; selectedSingleProduct = null;"
              >
                <div :class="['p-2.5 rounded-xl flex-shrink-0', actionMode === 'group' ? 'bg-blue-50 text-[var(--color-primary)]' : 'bg-slate-50 text-gray-400']">
                  <!-- Group/Folder Icon -->
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
                  </svg>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between gap-1.5">
                    <h4 class="text-xs font-extrabold text-slate-800">Grup Fiyat Güncelleme</h4>
                    <span class="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100 flex-shrink-0">10 Kredi</span>
                  </div>
                  <p class="text-[10px] text-[var(--color-text-muted)] mt-1 font-medium leading-relaxed">
                    Özel ürün grupları oluşturun ve sadece bu gruplardaki ürünlerin fiyatlarını topluca güncelleyin.
                  </p>
                </div>
              </button>
            </div>

            <!-- Right Side (2/3 Grid): Unified Form Container -->
            <div class="lg:col-span-2 bg-white rounded-2xl border border-[var(--color-border)] p-6 shadow-sm flex flex-col justify-between min-h-[380px]">
              
              <!-- ─── Form Header ─── -->
              <div class="border-b border-gray-50 pb-4 mb-4">
                <h3 class="text-sm font-black text-slate-800">
                  {{ actionMode === 'bulk' ? 'Toplu Fiyat Güncelleme Formu' : (actionMode === 'single' ? 'Tekil Ürün Arama ve Düzenleme' : 'Grup Yönetimi ve Fiyat Güncelleme') }}
                </h3>
                <p class="text-xs text-[var(--color-text-muted)] mt-0.5 font-medium">
                  {{ actionMode === 'bulk' ? 'Girdiğiniz parametrelere göre tüm varyantlar hesaplanarak Trendyol API\'sine iletilir.' : (actionMode === 'single' ? 'Arama yaparak varyantı seçin ve canlı fiyatını doğrudan değiştirin.' : 'Özel ürün grupları oluşturup yönetin ve sadece bu gruba ait fiyatları topluca güncelleyin.') }}
                </p>
              </div>

              <!-- ─── MODE: BULK FORM ─── -->
              <div v-if="actionMode === 'bulk'" class="flex-1 flex flex-col justify-between">
                <form @submit.prevent="handleBulkApply" class="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <!-- Op type -->
                  <div>
                    <label for="bulk-op-select" class="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">İşlem Yönü</label>
                    <select
                      id="bulk-op-select"
                      v-model="bulkOp"
                      class="w-full bg-slate-50 border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs font-bold text-[var(--color-text-primary)] outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-[var(--color-primary)] transition-all"
                    >
                      <option value="increase">Fiyatları Artır (+)</option>
                      <option value="decrease">Fiyatları Düşür (-)</option>
                    </select>
                  </div>

                  <!-- Type -->
                  <div>
                    <label for="bulk-type-select" class="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Hesaplama Tipi</label>
                    <select
                      id="bulk-type-select"
                      v-model="bulkType"
                      class="w-full bg-slate-50 border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs font-bold text-[var(--color-text-primary)] outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-[var(--color-primary)] transition-all"
                    >
                      <option value="percent">Yüzdesel (%)</option>
                      <option value="fixed">Sabit Tutar (TL)</option>
                    </select>
                  </div>

                  <!-- Value -->
                  <div>
                    <label for="bulk-val-input" class="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Miktar / Değer</label>
                    <div class="relative">
                      <input
                        id="bulk-val-input"
                        v-model.number="bulkValue"
                        type="number"
                        min="1"
                        required
                        class="w-full bg-slate-50 border border-[var(--color-border)] rounded-xl pl-3 pr-10 py-2 text-xs font-bold text-[var(--color-text-primary)] outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-[var(--color-primary)] transition-all"
                      />
                      <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-black">
                        {{ bulkType === 'percent' ? '%' : 'TL' }}
                      </span>
                    </div>
                  </div>
                </form>

                <!-- Bulk Warning / Summary Box -->
                <div class="mt-6 p-4 bg-amber-50/70 border border-amber-100 rounded-xl flex items-start gap-3">
                  <svg class="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <circle cx="12" cy="12" r="10" stroke-width="1.75"/><line x1="12" y1="8" x2="12" y2="12" stroke-width="1.75"/><line x1="12" y1="16" x2="12.01" y2="16" stroke-width="1.75"/>
                  </svg>
                  <div class="text-[11px] text-amber-700 leading-relaxed font-semibold">
                    Bu işlem mağazanızda kayıtlı tüm <span class="font-extrabold text-amber-900 underline">{{ products.length }}</span> varyantın fiyatlarını etkileyecektir. 
                    Toplu fiyat güncelleme talebi gönderildikten sonra Trendyol entegrasyon sırasına alınır.
                  </div>
                </div>

                <div class="flex justify-end pt-4">
                  <button
                    type="button"
                    :disabled="isBulkUpdating || products.length === 0"
                    class="btn-primary py-2.5 px-6 text-xs font-bold rounded-xl"
                    @click="handleBulkApply"
                  >
                    {{ isBulkUpdating ? 'Hesaplanıyor ve Gönderiliyor...' : `Toplu Değişikliği Gönder (${CREDIT_COSTS.bulk_update} Kredi)` }}
                  </button>
                </div>
              </div>

              <!-- ─── MODE: SINGLE FORM ─── -->
              <div v-else-if="actionMode === 'single'" class="flex-1 flex flex-col justify-between space-y-4">
                <!-- Search bar dropdown -->
                <div v-if="!selectedSingleProduct" class="relative flex-1">
                  <div class="relative">
                    <div class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <circle cx="11" cy="11" r="8" stroke-width="2"/><path d="M21 21l-4.3-4.3" stroke-width="2"/>
                      </svg>
                    </div>
                    <input
                      v-model="singleSearchQuery"
                      type="text"
                      placeholder="Barkod, SKU veya ürün adı ile varyant arayın..."
                      class="w-full bg-slate-50 border border-[var(--color-border)] rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-[var(--color-text-primary)] outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-[var(--color-primary)] transition-all"
                    />
                  </div>

                  <!-- Dropdown Search list (Premium Glassmorphic Redesign) -->
                  <div
                    v-if="searchResults.length > 0"
                    class="absolute z-20 w-full mt-2 bg-white/90 backdrop-blur-lg border border-slate-100 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.12)] overflow-y-auto max-h-64 p-1.5 space-y-1"
                  >
                    <button
                      v-for="prod in searchResults"
                      :key="prod.barcode"
                      type="button"
                      class="w-full flex items-center justify-between p-2.5 hover:bg-blue-50/50 hover:translate-x-1 rounded-xl transition-all duration-200 cursor-pointer text-left"
                      @click="selectProduct(prod)"
                    >
                      <div class="flex items-center gap-3 min-w-0">
                        <img
                          v-if="prod.images && prod.images[0]"
                          :src="prod.images[0].url"
                          alt=""
                          class="w-10 h-10 rounded-xl object-cover border border-slate-150/40 flex-shrink-0 shadow-sm"
                        />
                        <div v-else class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 border border-slate-200/40">
                          <svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"/>
                          </svg>
                        </div>
                        <div class="min-w-0">
                          <p class="text-xs font-bold text-slate-800 truncate" :title="prod.title">{{ prod.title }}</p>
                          <div class="flex items-center gap-1.5 mt-0.5 text-[9px] font-semibold text-slate-400 font-mono">
                            <span>SKU: {{ prod.stockCode }}</span>
                            <span class="text-slate-300">•</span>
                            <span>BK: {{ prod.barcode }}</span>
                          </div>
                        </div>
                      </div>
                      <div class="text-right ml-3 flex-shrink-0">
                        <span class="inline-block bg-slate-50 text-slate-800 px-2.5 py-1 rounded-xl text-xs font-black border border-slate-100/50">
                          {{ formatCurrency(prod.salePrice) }}
                        </span>
                      </div>
                    </button>
                  </div>

                  <!-- No products selected prompt -->
                  <div class="flex flex-col items-center justify-center py-8 text-center text-gray-400">
                    <svg class="w-10 h-10 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                    <p class="text-[11px] font-bold">Lütfen yukarıdaki kutuyu kullanarak bir varyant seçin.</p>
                  </div>
                </div>

                <!-- Product Selected State -->
                <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-5 flex-1 items-start">
                  
                  <!-- Selected Product Details Card -->
                  <div class="p-4 bg-slate-50 border border-gray-100 rounded-xl space-y-3">
                    <div class="flex items-center gap-3">
                      <img
                        v-if="selectedSingleProduct.images && selectedSingleProduct.images[0]"
                        :src="selectedSingleProduct.images[0].url"
                        alt=""
                        class="w-10 h-10 rounded-lg object-cover border border-gray-200"
                      />
                      <div class="min-w-0">
                        <h4 class="text-xs font-extrabold text-slate-800 truncate font-black" :title="selectedSingleProduct.title">
                          {{ selectedSingleProduct.title }}
                        </h4>
                        <p class="text-[9px] text-gray-400 font-mono mt-0.5">SKU: {{ selectedSingleProduct.stockCode }}</p>
                      </div>
                    </div>

                    <div class="border-t border-gray-200/50 pt-2 space-y-1.5 text-[10px] font-bold text-gray-500">
                      <div class="flex justify-between">
                        <span>Mevcut Satış Fiyatı:</span>
                        <span class="text-slate-800">{{ formatCurrency(selectedSingleProduct.salePrice) }}</span>
                      </div>
                      <div class="flex justify-between">
                        <span>Kategori Komisyonu:</span>
                        <span class="text-blue-600">%{{ sanitize(selectedSingleProduct.commissionRate, 15) }}</span>
                      </div>
                      <div class="flex justify-between">
                        <span>Aktif Stok:</span>
                        <span class="text-slate-800">{{ selectedSingleProduct.quantity }} adet</span>
                      </div>
                    </div>
                  </div>

                  <!-- Target Pricing Input Form -->
                  <div class="space-y-4">
                    <div class="grid grid-cols-2 gap-3">
                      <div>
                        <label for="single-list-input" class="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Liste Fiyatı (TL)</label>
                        <input
                          id="single-list-input"
                          v-model.number="singleNewListPrice"
                          type="number"
                          min="0"
                          required
                          class="w-full bg-slate-50 border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs font-bold text-[var(--color-text-primary)] outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-[var(--color-primary)] transition-all"
                        />
                      </div>
                      <div>
                        <label for="single-sale-input" class="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Satış Fiyatı (TL)</label>
                        <input
                          id="single-sale-input"
                          v-model.number="singleNewSalePrice"
                          type="number"
                          min="0"
                          required
                          class="w-full bg-slate-50 border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs font-bold text-[var(--color-text-primary)] outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-[var(--color-primary)] transition-all"
                        />
                      </div>
                    </div>

                    <!-- Profit Math Yield Box -->
                    <div class="p-3 bg-emerald-50/50 border border-emerald-100/50 rounded-xl flex items-center justify-between text-xs font-bold">
                      <span class="text-emerald-700">Tahmini Yeni Hakediş:</span>
                      <span class="text-emerald-800 text-sm font-black">
                        {{ formatCurrency(singleNewSalePrice * (1 - sanitize(selectedSingleProduct.commissionRate, 15) / 100)) }}
                      </span>
                    </div>

                    <div class="flex gap-2 pt-2">
                      <button
                        type="button"
                        class="flex-1 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 bg-white hover:bg-slate-50 rounded-xl border border-gray-200 transition-colors cursor-pointer"
                        @click="selectedSingleProduct = null"
                      >
                        Vazgeç
                      </button>
                      <button
                        type="button"
                        :disabled="isUpdating"
                        class="flex-1 py-2 text-xs font-bold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] rounded-xl transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                        @click="handleSingleApply"
                      >
                        {{ isUpdating ? 'Gönderiliyor...' : `Güncelle (${CREDIT_COSTS.single_edit} Kredi)` }}
                      </button>
                    </div>
                  </div>

                </div>
              </div>

              <!-- ─── MODE: GROUP UPDATE ─── -->
              <div v-else-if="actionMode === 'group'" class="flex-1 flex flex-col justify-between space-y-4">
                
                <!-- Sub-view 1: CREATE GROUP FORM -->
                <div v-if="isCreatingGroup" class="space-y-4 animate-in fade-in duration-200">
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- Group Name -->
                    <div>
                      <label for="group-name-input" class="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Grup İsmi</label>
                      <input
                        id="group-name-input"
                        v-model="newGroupName"
                        type="text"
                        placeholder="Örn: Yaz Fırsatları, Charm Grubu"
                        class="w-full bg-slate-50 border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-[var(--color-primary)] transition-all"
                      />
                    </div>
                    
                    <!-- Search to add -->
                    <div class="relative">
                      <label for="group-search-input" class="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Gruba Ürün Ekle</label>
                      <input
                        id="group-search-input"
                        v-model="groupProductSearchQuery"
                        type="text"
                        placeholder="Ürün adı, barkod veya SKU yazın..."
                        class="w-full bg-slate-50 border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-[var(--color-primary)] transition-all"
                      />

                      <!-- Dropdown results to add -->
                      <div
                        v-if="groupSearchProducts.length > 0"
                        class="absolute z-30 w-full mt-1.5 bg-white border border-gray-150 rounded-xl shadow-2xl overflow-y-auto max-h-40 p-1 space-y-1"
                      >
                        <button
                          v-for="prod in groupSearchProducts"
                          :key="prod.barcode"
                          type="button"
                          class="w-full flex items-center gap-3 p-2 hover:bg-slate-50 transition-colors text-left rounded-lg cursor-pointer"
                          @click="addToGroup(prod.barcode)"
                        >
                          <img
                            v-if="prod.images && prod.images[0]"
                            :src="prod.images[0].url"
                            alt=""
                            class="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                          />
                          <div class="min-w-0 flex-1">
                            <p class="text-xs font-bold text-slate-800 truncate">{{ prod.title }}</p>
                            <p class="text-[9px] text-gray-400 font-mono">BK: {{ prod.barcode }}</p>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- Added Products in group preview list -->
                  <div>
                    <label class="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-2">Gruptaki Seçili Ürünler ({{ newGroupBarcodes.length }})</label>
                    <div v-if="newGroupBarcodes.length === 0" class="py-6 border border-dashed border-gray-200 rounded-xl text-center text-[11px] text-gray-400 font-bold">
                      Henüz gruba ürün eklenmedi. Arama kutusunu kullanarak ürün ekleyin.
                    </div>
                    <div v-else class="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                      <div
                        v-for="barcode in newGroupBarcodes"
                        :key="barcode"
                        class="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-gray-100/50 animate-in fade-in duration-150"
                      >
                        <div class="flex items-center gap-2 min-w-0">
                          <img
                            v-if="getProductByBarcode(barcode)?.images?.[0]"
                            :src="getProductByBarcode(barcode)?.images?.[0].url"
                            alt=""
                            class="w-7 h-7 rounded-lg object-cover flex-shrink-0"
                          />
                          <p class="text-xs font-bold text-slate-700 truncate min-w-0">
                            {{ getProductByBarcode(barcode)?.title }}
                          </p>
                        </div>
                        <button
                          type="button"
                          class="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          @click="removeFromGroup(barcode)"
                          title="Kaldır"
                        >
                          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.8 13.5a2 2 0 01-2 1.5H7.8a2 2 0 01-2-1.5L5 7m5 4v6m4-6v6M1 4h22M8 4V1h8v3"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- Actions -->
                  <div class="flex gap-2 justify-end pt-2">
                    <button
                      type="button"
                      class="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 bg-white hover:bg-slate-50 border border-gray-200 rounded-xl cursor-pointer"
                      @click="isCreatingGroup = false; newGroupName = ''; newGroupBarcodes = [];"
                    >
                      Vazgeç
                    </button>
                    <button
                      type="button"
                      class="btn-primary px-4 py-2 text-xs font-bold rounded-xl cursor-pointer"
                      @click="saveGroup"
                    >
                      Grubu Kaydet
                    </button>
                  </div>
                </div>

                <!-- Sub-view 2: SELECT GROUP AND UPDATE PRICE -->
                <div v-else class="space-y-4 animate-in fade-in duration-200 flex-1 flex flex-col justify-between">
                  <div class="space-y-4">
                    <!-- Dropdown Select & Actions -->
                    <div class="flex flex-col sm:flex-row gap-3 items-end">
                      <div class="flex-1 w-full">
                        <label for="group-select" class="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Ürün Grubu Seçin</label>
                        <select
                          id="group-select"
                          v-model="activeGroupId"
                          :disabled="groups.length === 0"
                          class="w-full bg-slate-50 border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs font-bold text-[var(--color-text-primary)] outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-[var(--color-primary)] transition-all"
                        >
                          <option v-if="groups.length === 0" value="">Kayıtlı grup bulunmuyor</option>
                          <option v-for="g in groups" :key="g.id" :value="g.id">
                            {{ g.name }} ({{ g.barcodes.length }} Ürün)
                          </option>
                        </select>
                      </div>

                      <div class="flex gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          class="w-full sm:w-auto px-4 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all cursor-pointer border border-transparent whitespace-nowrap"
                          @click="isCreatingGroup = true"
                        >
                          + Yeni Grup Oluştur
                        </button>
                        <button
                          v-if="groups.length > 0"
                          type="button"
                          class="px-4 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all cursor-pointer whitespace-nowrap"
                          @click="deleteGroup(activeGroupId)"
                        >
                          Sil
                        </button>
                      </div>
                    </div>

                    <!-- If no group exists placeholder -->
                    <div v-if="groups.length === 0" class="py-12 text-center text-gray-400 font-bold border border-dashed border-gray-200 rounded-2xl">
                      <svg class="w-12 h-12 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
                      </svg>
                      <p class="text-xs">Mağazanızda tanımlanmış bir ürün grubu bulunmuyor.</p>
                      <button
                        type="button"
                        class="text-blue-600 hover:text-blue-800 text-xs font-bold mt-2"
                        @click="isCreatingGroup = true"
                      >
                        Hemen İlk Grubunuzu Oluşturun ➔
                      </button>
                    </div>

                    <!-- If group exists, show Pricing form and products in group -->
                    <div v-else class="space-y-4">
                      <!-- Group Bulk Form -->
                      <form @submit.prevent="handleGroupBulkApply" class="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-4 border border-gray-100 rounded-xl">
                        <!-- Op type -->
                        <div>
                          <label for="group-bulk-op" class="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1">İşlem Yönü</label>
                          <select
                            id="group-bulk-op"
                            v-model="groupBulkOp"
                            class="w-full bg-white border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 text-xs font-bold text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-blue-100 focus:border-[var(--color-primary)] transition-all"
                          >
                            <option value="increase">Fiyatları Artır (+)</option>
                            <option value="decrease">Fiyatları Düşür (-)</option>
                          </select>
                        </div>
                        
                        <!-- Calculation type -->
                        <div>
                          <label for="group-bulk-type" class="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Hesaplama Tipi</label>
                          <select
                            id="group-bulk-type"
                            v-model="groupBulkType"
                            class="w-full bg-white border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 text-xs font-bold text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-blue-100 focus:border-[var(--color-primary)] transition-all"
                          >
                            <option value="percent">Yüzdesel (%)</option>
                            <option value="fixed">Sabit Tutar (TL)</option>
                          </select>
                        </div>

                        <!-- Value -->
                        <div>
                          <label for="group-bulk-val" class="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Değer</label>
                          <div class="relative">
                            <input
                              id="group-bulk-val"
                              v-model.number="groupBulkValue"
                              type="number"
                              min="1"
                              required
                              class="w-full bg-white border border-[var(--color-border)] rounded-lg pl-2.5 pr-8 py-1.5 text-xs font-bold text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-blue-100 focus:border-[var(--color-primary)] transition-all"
                            />
                            <span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold">
                              {{ groupBulkType === 'percent' ? '%' : 'TL' }}
                            </span>
                          </div>
                        </div>
                      </form>

                      <!-- Products in group list review -->
                      <div>
                        <label class="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Gruptaki Ürünler ({{ activeGroupProducts.length }})</label>
                        <div class="max-h-24 overflow-y-auto space-y-1 pr-1">
                          <div
                            v-for="prod in activeGroupProducts"
                            :key="prod.barcode"
                            class="flex items-center justify-between text-[11px] font-semibold text-slate-700 bg-slate-50/50 p-2 rounded-lg border border-gray-100"
                          >
                            <div class="flex items-center gap-2 truncate">
                              <img
                                v-if="prod.images && prod.images[0]"
                                :src="prod.images[0].url"
                                alt=""
                                class="w-6 h-6 rounded-md object-cover border border-gray-100 flex-shrink-0"
                              />
                              <span class="truncate">{{ prod.title }}</span>
                            </div>
                            <span class="text-slate-800 whitespace-nowrap ml-2 font-bold">{{ formatCurrency(prod.salePrice) }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Submit button -->
                  <div v-if="groups.length > 0" class="flex justify-end pt-2 border-t border-gray-50">
                    <button
                      type="button"
                      :disabled="isGroupUpdating || activeGroupProducts.length === 0"
                      class="btn-primary py-2.5 px-6 text-xs font-bold rounded-xl"
                      @click="handleGroupBulkApply"
                    >
                      {{ isGroupUpdating ? 'Grup Fiyatları Güncelleniyor...' : `Değişiklikleri Canlı Uygula (${CREDIT_COSTS.group_update} Kredi)` }}
                    </button>
                  </div>
                </div>

              </div>

            </div>

          </div>

          <!-- Bottom Section: Transaction Logs Card -->
          <div class="bg-white rounded-2xl border border-[var(--color-border)] p-5 shadow-sm space-y-4 animate-in fade-in duration-350">
            <div>
              <h3 class="text-sm font-bold text-[var(--color-text-primary)]">Fiyat Değişim Geçmişi</h3>
              <p class="text-xs text-[var(--color-text-muted)] mt-0.5 font-medium">Bu mağaza için Trendyol canlı API'sine başarıyla gönderilen son güncelleme günlükleri.</p>
            </div>

            <!-- Log Table -->
            <div class="overflow-x-auto">
              <table class="w-full text-xs text-left" aria-label="Fiyat işlem günlüğü">
                <thead>
                  <tr class="border-b border-gray-100 text-gray-400 font-bold bg-[#F8FAFF]">
                    <th class="px-4 py-2.5">Tarih</th>
                    <th class="px-4 py-2.5">Ürün Varyant Bilgisi</th>
                    <th class="px-4 py-2.5 text-center">İşlem Türü</th>
                    <th class="px-4 py-2.5 text-right">Eski Fiyat</th>
                    <th class="px-4 py-2.5 text-right">Yeni Fiyat</th>
                    <th class="px-4 py-2.5 text-center">Entegrasyon Durumu</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-50">
                  <tr v-if="priceLogs.length === 0">
                    <td colspan="6" class="py-12 text-center text-gray-400 font-bold">
                      Bu mağazada henüz bir fiyat değişim kaydı oluşturulmamış.
                    </td>
                  </tr>
                  <tr v-else v-for="log in priceLogs" :key="log.id" class="hover:bg-slate-50/50 transition-colors">
                    <td class="px-4 py-3.5 text-[var(--color-text-muted)] font-semibold whitespace-nowrap">{{ log.date }}</td>
                    <td class="px-4 py-3.5 max-w-[280px]">
                      <div class="min-w-0">
                        <p class="font-bold text-slate-800 truncate" :title="log.title">{{ log.title }}</p>
                        <p v-if="log.barcode !== 'Tüm Varyantlar' && log.barcode !== 'Grup Varyantları'" class="text-[9px] font-mono text-gray-400 mt-0.5">Barkod: {{ log.barcode }}</p>
                      </div>
                    </td>
                    <td class="px-4 py-3.5 text-center">
                      <span
                        :class="[
                          'px-2.5 py-0.5 rounded-lg text-[9px] font-bold border',
                          log.type === 'Bireysel'
                            ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
                            : 'bg-purple-50 text-purple-600 border-purple-100'
                        ]"
                      >
                        {{ log.type }}
                      </span>
                    </td>
                    <td class="px-4 py-3.5 text-right font-medium text-gray-400 line-through whitespace-nowrap">{{ formatCurrency(log.oldPrice) }}</td>
                    <td class="px-4 py-3.5 text-right font-extrabold text-slate-800 whitespace-nowrap">{{ formatCurrency(log.newPrice) }}</td>
                    <td class="px-4 py-3.5 text-center whitespace-nowrap">
                      <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 font-extrabold text-[10px]">
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Trendyol Onaylı
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </template>

    </template>
  </main>

  <!-- ─── EDIT PRICE POPUP MODAL ─── -->
  <div v-if="isEditModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" role="dialog" aria-modal="true">
    <div class="bg-white rounded-2xl max-w-sm w-full border border-gray-100 shadow-2xl p-6 relative animate-in fade-in zoom-in duration-200">
      
      <!-- Close Button -->
      <button @click="closeEditModal" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 cursor-pointer">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>

      <h3 class="text-sm font-bold text-[var(--color-text-primary)] mb-2">Fiyat Güncelle</h3>
      <p class="text-xs text-[var(--color-text-muted)] mb-4 truncate">{{ editingProduct?.title }}</p>

      <form @submit.prevent="handleUpdatePrice" class="space-y-4">
        
        <!-- List Price Input -->
        <div>
          <label for="list-price-input" class="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Piyasa Liste Fiyatı (Üstü Çizili)</label>
          <div class="relative">
            <input
              id="list-price-input"
              v-model.number="newListPrice"
              type="number"
              min="0"
              required
              class="w-full bg-slate-50 border border-[var(--color-border)] rounded-xl pl-3 pr-8 py-2 text-xs font-semibold text-[var(--color-text-primary)] outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-[var(--color-primary)] transition-all"
            />
            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">TL</span>
          </div>
        </div>

        <!-- Sale Price Input -->
        <div>
          <label for="sale-price-input" class="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Trendyol İndirimli Satış Fiyatı</label>
          <div class="relative">
            <input
              id="sale-price-input"
              v-model.number="newSalePrice"
              type="number"
              min="0"
              required
              class="w-full bg-slate-50 border border-[var(--color-border)] rounded-xl pl-3 pr-8 py-2 text-xs font-semibold text-[var(--color-text-primary)] outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-[var(--color-primary)] transition-all"
            />
            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">TL</span>
          </div>
        </div>

        <!-- Live Calculation Preview -->
        <div class="p-3 bg-slate-50 rounded-xl border border-gray-100 text-xs space-y-1.5 font-medium">
          <div class="flex justify-between">
            <span class="text-gray-500">Kategori Komisyonu:</span>
            <span class="text-blue-600 font-semibold">%{{ sanitize(editingProduct?.commissionRate, 15) }}</span>
          </div>
          <div class="flex justify-between border-t border-gray-200/50 pt-1.5 font-bold">
            <span class="text-gray-500">Tahmini Yeni Hakediş:</span>
            <span class="text-emerald-600 font-black">
              {{ formatCurrency(newSalePrice * (1 - sanitize(editingProduct?.commissionRate, 15) / 100)) }}
            </span>
          </div>
        </div>

        <!-- Action buttons -->
        <div class="flex gap-2.5 pt-2">
          <button
            type="button"
            class="flex-1 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all cursor-pointer border border-transparent"
            @click="closeEditModal"
          >
            İptal
          </button>
          <button
            type="submit"
            :disabled="isUpdating"
            class="flex-1 py-2 text-xs font-bold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] rounded-xl transition-all cursor-pointer shadow-sm disabled:opacity-50"
          >
            {{ isUpdating ? 'Güncelleniyor...' : 'Fiyatı Güncelle' }}
          </button>
        </div>

      </form>
    </div>
  </div>
</template>

<style scoped>
.metric-card {
  transition: all 0.2s ease;
}
.metric-card:hover {
  box-shadow: 0 4px 12px rgba(37,99,235,0.04);
  border-color: var(--color-primary-lighter);
}
</style>
