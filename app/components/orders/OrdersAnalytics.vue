<script setup lang="ts">
/**
 * OrdersAnalytics — Interactive dashboard analytics for e-commerce orders.
 * Contains metric cards, interactive ciro/AOV line charts, status progress,
 * futuristic radial clock (24-hour order density filtered by weekday),
 * and top 5 selling products bar charts.
 */

import type { TrendyolOrder } from '~/types'
import TurkeyMap from './TurkeyMap.vue'

const props = defineProps<{ orders: TrendyolOrder[] }>()

const STATUS_LABELS: Record<string, string> = {
  Created:          'Yeni Sipariş',
  Picking:          'Hazırlanıyor',
  Invoiced:         'Faturalandı',
  Shipped:          'Kargoda',
  Delivered:        'Teslim Edildi',
  Cancelled:        'İptal Edildi',
  UnDelivered:      'Teslim Edilemedi',
  Returned:         'İade Edildi',
  WaitingForSupply: 'Tedarik Bekliyor',
  PickupPoint:      'Teslim Noktasında',
}

// ─── Filter for last 14 days ──────────────────────────────────────────────────
const recentOrders = computed(() => {
  const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000
  return props.orders.filter(o => o.orderDate >= fourteenDaysAgo)
})

// ─── Key Metrics ──────────────────────────────────────────────────────────────
const totalOrders = computed(() => recentOrders.value.length)

const totalRevenue = computed(() =>
  recentOrders.value.reduce((sum, o) => sum + o.grossAmount, 0)
)

const totalItemsSold = computed(() =>
  recentOrders.value.reduce((sum, o) =>
    sum + o.lines.reduce((lSum, l) => lSum + l.quantity, 0), 0
  )
)

const totalDiscount = computed(() =>
  recentOrders.value.reduce((sum, o) => sum + o.totalDiscount, 0)
)

// ─── Status Breakdown ─────────────────────────────────────────────────────────
const statusBreakdown = computed(() => {
  const counts: Record<string, number> = {}
  recentOrders.value.forEach(o => {
    const status = o.shipmentPackageStatus || o.status
    counts[status] = (counts[status] || 0) + 1
  })

  return Object.entries(counts)
    .map(([status, count]) => ({
      status,
      label: STATUS_LABELS[status] ?? status,
      count,
      percentage: totalOrders.value > 0 ? (count / totalOrders.value) * 100 : 0
    }))
    .sort((a, b) => b.count - a.count)
})

// ─── Top 5 Products ───────────────────────────────────────────────────────────
const topProducts = computed(() => {
  const prodMap: Record<string, { name: string; quantity: number; revenue: number }> = {}

  recentOrders.value.forEach(o => {
    o.lines.forEach(l => {
      const name = l.productName || 'Bilinmeyen Ürün'
      if (!prodMap[name]) {
        prodMap[name] = { name, quantity: 0, revenue: 0 }
      }
      prodMap[name].quantity += l.quantity
      prodMap[name].revenue += l.amount
    })
  })

  return Object.values(prodMap)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5)
})

const maxProductQuantity = computed(() => {
  return Math.max(...topProducts.value.map(p => p.quantity), 1)
})

// ─── Daily Trend Chart Data (Last 14 Days) ───────────────────────────────────
const dailyData = computed(() => {
  const dataMap: Record<string, { dateStr: string; amount: number; count: number; aov: number }> = {}

  // Prefill last 14 days
  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const label = d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })
    dataMap[key] = { dateStr: label, amount: 0, count: 0, aov: 0 }
  }

  // Populate from orders
  recentOrders.value.forEach(o => {
    const key = new Date(o.orderDate).toISOString().slice(0, 10)
    if (dataMap[key]) {
      dataMap[key].amount += o.grossAmount
      dataMap[key].count += 1
    }
  })

  // Calculate AOV
  Object.keys(dataMap).forEach(key => {
    const d = dataMap[key]
    d.aov = d.count > 0 ? d.amount / d.count : 0
  })

  return Object.values(dataMap)
})

// ─── Time Travel Selector (Last 7 Days) ──────────────────────────────────────
const selectedDate = ref<string>('all')

const last7Days = computed(() => {
  const days = []
  const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']
  for (let i = 0; i < 7; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    days.push({
      dateStr: key,
      label: `${d.getDate()} ${d.toLocaleDateString('tr-TR', { month: 'short' })} (${dayNames[d.getDay()]})`,
    })
  }
  return days
})

// ─── Hourly Distribution for Radial Clock (24 Hours) ──────────────────────────
const hourlyCounts = computed(() => {
  const counts = Array(24).fill(0)
  recentOrders.value.forEach(o => {
    const oDate = new Date(o.orderDate)
    const oDateStr = oDate.toISOString().slice(0, 10)

    // Filter by selected date if not 'all'
    if (selectedDate.value === 'all' || oDateStr === selectedDate.value) {
      const hour = oDate.getHours()
      counts[hour]++
    }
  })
  return counts
})

const maxHourlyCount = computed(() => {
  return Math.max(...hourlyCounts.value, 1)
})

const totalClockFilteredOrders = computed(() => {
  return hourlyCounts.value.reduce((a, b) => a + b, 0)
})

const peakHour = computed(() => {
  const counts = hourlyCounts.value
  let maxIdx = 0
  for (let i = 1; i < 24; i++) {
    if (counts[i] > counts[maxIdx]) maxIdx = i
  }
  return { hour: maxIdx, count: counts[maxIdx] }
})

// ─── SVG Radar Chart Calculations ──────────────────────────────────────────────
const clockCx = 180
const clockCy = 140
const clockRMin = 35  // Inner radius (donut center)
const clockRMax = 95  // Outer radius (peak)

// 24 points around the circle
const radialPoints = computed(() => {
  const counts = hourlyCounts.value
  const maxVal = maxHourlyCount.value

  return counts.map((count, hour) => {
    // 00:00 is at top (-PI/2)
    const angle = (hour / 24) * 2 * Math.PI - Math.PI / 2
    const r = clockRMin + (count / maxVal) * (clockRMax - clockRMin)
    const x = clockCx + r * Math.cos(angle)
    const y = clockCy + r * Math.sin(angle)

    // Helper coordinates for drawing grid lines
    const outerX = clockCx + clockRMax * Math.cos(angle)
    const outerY = clockCy + clockRMax * Math.sin(angle)
    const innerX = clockCx + clockRMin * Math.cos(angle)
    const innerY = clockCy + clockRMin * Math.sin(angle)

    return { x, y, r, angle, hour, count, outerX, outerY, innerX, innerY }
  })
})

const radialPath = computed(() => {
  const pts = radialPoints.value
  if (pts.length === 0) return ''
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'
})

// ─── Interaction State ───────────────────────────────────────────────────────
const activeHour = ref<number | null>(null)
const clockSvg = ref<SVGSVGElement | null>(null)

function handleClockMouseMove(e: MouseEvent) {
  if (!clockSvg.value) return
  const rect = clockSvg.value.getBoundingClientRect()
  
  // Calculate relative center in pixels
  const svgCx = rect.left + (clockCx / 360) * rect.width
  const svgCy = rect.top + (clockCy / 280) * rect.height

  // Get vector from center to mouse
  const dx = e.clientX - svgCx
  const dy = e.clientY - svgCy

  // Calculate angle, offset so top is 0
  let angle = Math.atan2(dy, dx) + Math.PI / 2
  if (angle < 0) angle += 2 * Math.PI

  // Map 0 - 2*PI angle to 0 - 23 hour
  const hour = Math.round((angle / (2 * Math.PI)) * 24) % 24
  activeHour.value = hour
}

function handleClockMouseLeave() {
  activeHour.value = null
}

const activeRadialPoint = computed(() => {
  if (activeHour.value === null) return null
  return radialPoints.value[activeHour.value] ?? null
})

// ─── Line Chart SVG Calculations ──────────────────────────────────────────────
const chartWidth = 500
const chartHeight = 160
const chartViewType = ref<'revenue' | 'aov'>('revenue')

const points = computed(() => {
  const data = dailyData.value
  if (data.length === 0) return []

  const valExtractor = (d: typeof data[0]) => chartViewType.value === 'revenue' ? d.amount : d.aov
  const maxVal = Math.max(...data.map(valExtractor), 1)

  return data.map((d, i) => {
    const val = valExtractor(d)
    const x = (i / (data.length - 1)) * chartWidth
    const y = chartHeight - (val / maxVal) * (chartHeight - 20) - 10
    return {
      x,
      y,
      value: val,
      count: d.count,
      dateStr: d.dateStr,
    }
  })
})

const linePath = computed(() => {
  const pts = points.value
  if (pts.length === 0) return ''

  let path = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i]
    const p1 = pts[i + 1]
    const cpX1 = p0.x + (p1.x - p0.x) / 3
    const cpY1 = p0.y
    const cpX2 = p0.x + 2 * (p1.x - p0.x) / 3
    const cpY2 = p1.y
    path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`
  }
  return path
})

const areaPath = computed(() => {
  const path = linePath.value
  if (!path) return ''
  return `${path} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`
})

// ─── Line Chart Interaction State ────────────────────────────────────────────
const activeIndex = ref<number | null>(null)
const chartSvg = ref<SVGSVGElement | null>(null)

function handleMouseMove(e: MouseEvent) {
  if (!chartSvg.value || points.value.length === 0) return
  const rect = chartSvg.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const percentage = Math.max(0, Math.min(1, x / rect.width))
  activeIndex.value = Math.round(percentage * (points.value.length - 1))
}

function handleMouseLeave() {
  activeIndex.value = null
}

const activePoint = computed(() => {
  if (activeIndex.value === null) return null
  return points.value[activeIndex.value] ?? null
})

const tooltipStyle = computed(() => {
  if (activeIndex.value === null || !activePoint.value) return { display: 'none' }
  const xPercent = (activeIndex.value / (points.value.length - 1)) * 100
  return {
    left: `${xPercent}%`,
    bottom: '100%',
    transform: 'translateX(-50%) translateY(-8px)',
    display: 'block'
  }
})

// ─── Cross Sell Analytics (NEW) ──────────────────────────────────────────────
const crossSellPairs = computed(() => {
  const pairMap: Record<string, { count: number; prodA: string; prodB: string }> = {}

  recentOrders.value.forEach(o => {
    const productsInOrder = o.lines.map(l => l.productName || 'Bilinmeyen Ürün')
    const uniqueProducts = Array.from(new Set(productsInOrder))
    
    if (uniqueProducts.length > 1) {
      for (let i = 0; i < uniqueProducts.length; i++) {
        for (let j = i + 1; j < uniqueProducts.length; j++) {
          const pA = uniqueProducts[i]
          const pB = uniqueProducts[j]
          const key = pA < pB ? `${pA} | ${pB}` : `${pB} | ${pA}`
          
          if (!pairMap[key]) {
            pairMap[key] = { count: 0, prodA: pA < pB ? pA : pB, prodB: pA < pB ? pB : pA }
          }
          pairMap[key].count++
        }
      }
    }
  })

  return Object.values(pairMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
})

const maxPairCount = computed(() => {
  return Math.max(...crossSellPairs.value.map(p => p.count), 1)
})

// ─── Regional City Product Associations (NEW) ─────────────────────────────────
const cityProductSales = computed(() => {
  const cityMap: Record<string, Record<string, number>> = {}

  recentOrders.value.forEach(o => {
    const city = o.shipmentAddress?.city?.trim()
    if (!city) return

    const formattedCity = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase()

    if (!cityMap[formattedCity]) {
      cityMap[formattedCity] = {}
    }

    o.lines.forEach(l => {
      const pName = l.productName || 'Bilinmeyen Ürün'
      cityMap[formattedCity][pName] = (cityMap[formattedCity][pName] || 0) + l.quantity
    })
  })

  return Object.entries(cityMap)
    .map(([city, prods]) => {
      const topProd = Object.entries(prods).sort((a, b) => b[1] - a[1])[0]
      return {
        city,
        productName: topProd ? topProd[0] : 'N/A',
        quantity: topProd ? topProd[1] : 0
      }
    })
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5)
})

const maxCitySales = computed(() => {
  return Math.max(...cityProductSales.value.map(c => c.quantity), 1)
})

// ─── Modal Popup State & co-purchase queries (NEW) ──────────────────────────
const activePairDetail = ref<any | null>(null)

const selectedPairOrders = computed(() => {
  if (!activePairDetail.value) return []
  const { prodA, prodB } = activePairDetail.value
  
  return recentOrders.value.filter(o => {
    const productsInOrder = o.lines.map(l => l.productName || 'Bilinmeyen Ürün')
    return productsInOrder.includes(prodA) && productsInOrder.includes(prodB)
  })
})

const selectedPairTotalRevenue = computed(() => {
  return selectedPairOrders.value.reduce((sum, o) => sum + o.grossAmount, 0)
})

// Full city map mapping top products for SVG Turkey Map (NEW)
const citySalesMap = computed(() => {
  const cityMap: Record<string, Record<string, number>> = {}

  recentOrders.value.forEach(o => {
    const city = o.shipmentAddress?.city?.trim()
    if (!city) return

    const cleanCityName = city.toUpperCase()

    if (!cityMap[cleanCityName]) {
      cityMap[cleanCityName] = {}
    }

    o.lines.forEach(l => {
      const pName = l.productName || 'Bilinmeyen Ürün'
      cityMap[cleanCityName][pName] = (cityMap[cleanCityName][pName] || 0) + l.quantity
    })
  })

  const resultMap: Record<string, { productName: string; quantity: number }> = {}
  Object.entries(cityMap).forEach(([city, prods]) => {
    const sorted = Object.entries(prods).sort((a, b) => b[1] - a[1])
    if (sorted.length > 0) {
      resultMap[city] = {
        productName: sorted[0][0],
        quantity: sorted[0][1]
      }
    }
  })

  return resultMap
})

// ─── City Detail Modal Popup Logic (NEW) ─────────────────────────────────────
const activeCityDetail = ref<{ id: string; name: string; code: string } | null>(null)

// Normalize function for mapping input city names to normalized IDs
function normalizeCityName(cityName: string): string {
  if (!cityName) return ''
  return cityName
    .replace(/İ/g, 'i')
    .replace(/ı/g, 'i')
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '')
}

const selectedCityOrders = computed(() => {
  if (!activeCityDetail.value) return []
  const targetId = activeCityDetail.value.id
  return recentOrders.value.filter(o => {
    const city = o.shipmentAddress?.city
    return city && normalizeCityName(city) === targetId
  })
})

const selectedCityTotalRevenue = computed(() => {
  return selectedCityOrders.value.reduce((sum, o) => sum + o.grossAmount, 0)
})

const selectedCityProducts = computed(() => {
  if (!activeCityDetail.value) return []
  const prodMap: Record<string, { name: string; quantity: number; revenue: number }> = {}
  
  selectedCityOrders.value.forEach(o => {
    o.lines.forEach(l => {
      const name = l.productName || 'Bilinmeyen Ürün'
      if (!prodMap[name]) {
        prodMap[name] = { name, quantity: 0, revenue: 0 }
      }
      prodMap[name].quantity += l.quantity
      prodMap[name].revenue += l.amount
    })
  })
  
  return Object.values(prodMap).sort((a, b) => b.quantity - a.quantity)
})

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(amount)
}
</script>

<template>
  <div class="space-y-6">

    <!-- ─── Metric Cards Grid ─── -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

      <!-- Revenue -->
      <div class="metric-card">
        <div class="flex items-center justify-between text-[var(--color-text-muted)] mb-2">
          <span class="text-xs font-semibold uppercase tracking-wider">Toplam Gelir</span>
          <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
        </div>
        <p class="text-2xl font-black text-[var(--color-text-primary)]">
          {{ formatCurrency(totalRevenue) }}
        </p>
        <p class="text-xs text-[var(--color-text-muted)] mt-1">Son 14 günlük ciro</p>
      </div>

      <!-- Orders Count -->
      <div class="metric-card">
        <div class="flex items-center justify-between text-[var(--color-text-muted)] mb-2">
          <span class="text-xs font-semibold uppercase tracking-wider">Sipariş Sayısı</span>
          <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
            </svg>
          </div>
        </div>
        <p class="text-2xl font-black text-[var(--color-text-primary)]">
          {{ totalOrders }} Adet
        </p>
        <p class="text-xs text-[var(--color-text-muted)] mt-1">Gelen toplam sipariş</p>
      </div>

      <!-- Items Sold -->
      <div class="metric-card">
        <div class="flex items-center justify-between text-[var(--color-text-muted)] mb-2">
          <span class="text-xs font-semibold uppercase tracking-wider">Satılan Ürün</span>
          <div class="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"/>
            </svg>
          </div>
        </div>
        <p class="text-2xl font-black text-[var(--color-text-primary)]">
          {{ totalItemsSold }} Adet
        </p>
        <p class="text-xs text-[var(--color-text-muted)] mt-1">Fiziksel ürün satışı</p>
      </div>

      <!-- Total Discount -->
      <div class="metric-card">
        <div class="flex items-center justify-between text-[var(--color-text-muted)] mb-2">
          <span class="text-xs font-semibold uppercase tracking-wider">Toplam İndirim</span>
          <div class="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
          </div>
        </div>
        <p class="text-2xl font-black text-rose-600">
          -{{ formatCurrency(totalDiscount) }}
        </p>
        <p class="text-xs text-[var(--color-text-muted)] mt-1">Uygulanan kampanya/kupon</p>
      </div>

    </div>

    <!-- ─── Row 1: Charts (Revenue / AOV + Statuses) ─── -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

      <!-- Chart 1: Interactive Line Chart (Takes 2 cols) -->
      <div class="lg:col-span-2 bg-white rounded-2xl border border-[var(--color-border)] p-5 flex flex-col justify-between">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-sm font-bold text-[var(--color-text-primary)]">
              {{ chartViewType === 'revenue' ? 'Günlük Ciro Trendi' : 'Ortalama Sepet Tutarı (AOV)' }}
            </h3>
            <p class="text-xs text-[var(--color-text-muted)] mt-0.5">Mouse ile grafik üzerinde gezinebilirsiniz</p>
          </div>
          <!-- Toggle switcher -->
          <div class="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
            <button
              type="button"
              :class="['px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer', chartViewType === 'revenue' ? 'bg-white shadow text-[var(--color-primary)]' : 'text-gray-500 hover:text-gray-900']"
              @click="chartViewType = 'revenue'"
            >
              Ciro
            </button>
            <button
              type="button"
              :class="['px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer', chartViewType === 'aov' ? 'bg-white shadow text-[var(--color-primary)]' : 'text-gray-500 hover:text-gray-900']"
              @click="chartViewType = 'aov'"
            >
              Sepet
            </button>
          </div>
        </div>

        <div class="my-6 relative">
          <!-- Floating Tooltip -->
          <div
            v-if="activePoint"
            class="absolute z-10 bg-slate-900/90 backdrop-blur-md text-white rounded-xl p-3 shadow-xl pointer-events-none transition-all duration-75 border border-slate-700"
            :style="tooltipStyle"
          >
            <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">{{ activePoint.dateStr }}</p>
            <p class="text-sm font-black text-white mt-1">
              {{ chartViewType === 'revenue' ? 'Ciro: ' : 'Sepet: ' }} {{ formatCurrency(activePoint.value) }}
            </p>
            <p class="text-[10px] text-emerald-400 font-semibold mt-0.5">{{ activePoint.count }} yeni sipariş</p>
          </div>

          <svg
            ref="chartSvg"
            :viewBox="`0 0 ${chartWidth} ${chartHeight}`"
            class="w-full h-44 overflow-visible cursor-crosshair select-none"
            @mousemove="handleMouseMove"
            @mouseleave="handleMouseLeave"
          >
            <!-- Grid Lines -->
            <line x1="0" :y1="chartHeight - 10" :x2="chartWidth" :y2="chartHeight - 10" stroke="#F1F5F9" stroke-width="1.5" />
            <line x1="0" :y1="chartHeight / 2" :x2="chartWidth" :y2="chartHeight / 2" stroke="#F1F5F9" stroke-width="1" stroke-dasharray="4" />
            <line x1="0" y1="10" :x2="chartWidth" :y2="chartHeight / 2" stroke="#F1F5F9" stroke-width="1" />

            <!-- Gradient Area -->
            <path v-if="areaPath" :d="areaPath" fill="url(#revenueGrad)" />

            <!-- Line Path -->
            <path
              v-if="linePath"
              :d="linePath"
              fill="none"
              stroke="var(--color-primary)"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />

            <!-- Interactive Guide Line and Dot -->
            <g v-if="activePoint">
              <!-- Vertical Guide Line -->
              <line
                :x1="activePoint.x"
                y1="10"
                :x2="activePoint.x"
                :y2="chartHeight - 10"
                stroke="var(--color-primary)"
                stroke-width="1.5"
                stroke-dasharray="3"
              />
              <!-- Outer Glow Circle -->
              <circle
                :cx="activePoint.x"
                :cy="activePoint.y"
                r="7"
                fill="var(--color-primary)"
                opacity="0.25"
                class="animate-ping"
              />
              <!-- Inner Solid Circle -->
              <circle
                :cx="activePoint.x"
                :cy="activePoint.y"
                r="4.5"
                fill="white"
                stroke="var(--color-primary)"
                stroke-width="3"
              />
            </g>
          </svg>
        </div>

        <!-- X-Axis Labels -->
        <div class="flex justify-between text-[10px] font-bold text-[var(--color-text-muted)] border-t border-gray-50 pt-2 px-1">
          <span>{{ dailyData[0]?.dateStr }}</span>
          <span>{{ dailyData[Math.floor(dailyData.length / 2)]?.dateStr }}</span>
          <span>{{ dailyData[dailyData.length - 1]?.dateStr }}</span>
        </div>
      </div>

      <!-- Chart 2: Status Breakdown (Takes 1 col) -->
      <div class="bg-white rounded-2xl border border-[var(--color-border)] p-5 flex flex-col justify-between">
        <div>
          <h3 class="text-sm font-bold text-[var(--color-text-primary)]">Sipariş Durumları</h3>
          <p class="text-xs text-[var(--color-text-muted)] mt-0.5">Siparişlerin aşama bazlı dağılımı</p>
        </div>

        <!-- Breakdown List -->
        <div class="my-4 flex-1 flex flex-col justify-center space-y-3.5">
          <div v-if="statusBreakdown.length === 0" class="text-center py-8 text-xs text-[var(--color-text-muted)]">
            Aşama verisi yok
          </div>
          <div
            v-for="item in statusBreakdown.slice(0, 5)"
            :key="item.status"
            class="space-y-1.5 group cursor-pointer"
          >
            <div class="flex items-center justify-between text-xs font-semibold">
              <span class="text-[var(--color-text-secondary)] group-hover:text-[var(--color-primary)] transition-colors">{{ item.label }}</span>
              <span class="text-[var(--color-text-primary)]">{{ item.count }} adet ({{ Math.round(item.percentage) }}%)</span>
            </div>
            <!-- Progress Bar -->
            <div class="h-2 rounded-full bg-gray-100 overflow-hidden" aria-hidden="true">
              <div
                class="h-full rounded-full transition-all duration-300"
                :style="`width: ${item.percentage}%; background: var(--color-primary);`"
              />
            </div>
          </div>
        </div>

        <div class="text-[10px] text-center text-[var(--color-text-muted)] border-t border-gray-50 pt-2 font-medium">
          Son 14 günün verileridir
        </div>
      </div>

    </div>

    <!-- ─── Row 2: Heatmap (Radial Clock) & Top Products ─── -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

      <!-- Radial Clock Chart (Takes 2 cols) -->
      <div class="lg:col-span-2 bg-white rounded-2xl border border-[var(--color-border)] p-5 flex flex-col justify-between">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-50 pb-3">
          <div>
            <h3 class="text-sm font-bold text-[var(--color-text-primary)]">Saatlik Sipariş Dağılımı (24s Kadranı)</h3>
            <p class="text-xs text-[var(--color-text-muted)] mt-0.5">Grafiğin altından günü filtreleyebilirsiniz</p>
          </div>
        </div>

        <!-- Day Selector Buttons (Last 7 Days) -->
        <div class="flex gap-1.5 overflow-x-auto py-2 my-1 scrollbar-none border-b border-gray-50">
          <button
            type="button"
            :class="[
              'px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-all whitespace-nowrap cursor-pointer',
              selectedDate === 'all'
                ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
            ]"
            @click="selectedDate = 'all'"
          >
            Tüm Haftalar
          </button>
          <button
            v-for="day in last7Days"
            :key="day.dateStr"
            type="button"
            :class="[
              'px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-all whitespace-nowrap cursor-pointer',
              selectedDate === day.dateStr
                ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
            ]"
            @click="selectedDate = day.dateStr"
          >
            {{ day.label }}
          </button>
        </div>

        <div class="flex flex-col md:flex-row items-center gap-6 my-4">
          <!-- Radial Clock SVG -->
          <div class="relative w-full max-w-[280px] aspect-square flex-shrink-0 mx-auto md:mx-0">
            <!-- Central Clock Floating Tooltip -->
            <div
              v-if="activeRadialPoint"
              class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-24 h-24 rounded-full bg-slate-900/95 backdrop-blur-sm border border-slate-700 text-white flex flex-col items-center justify-center text-center p-1 pointer-events-none transition-all"
            >
              <span class="text-[10px] font-bold text-slate-400">{{ activeRadialPoint.hour }}:00</span>
              <span class="text-base font-black mt-0.5">{{ activeRadialPoint.count }} Adet</span>
              <span class="text-[8px] font-bold text-emerald-400 leading-tight mt-0.5">Sipariş</span>
            </div>

            <!-- Fallback central indicator when no hover -->
            <div
              v-else
              class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-24 h-24 rounded-full bg-gray-50 border border-gray-100 flex flex-col items-center justify-center text-center p-1 pointer-events-none"
            >
              <svg class="w-5 h-5 text-[var(--color-primary-lighter)] mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="12" cy="12" r="10" stroke-width="1.75"/><polyline points="12 6 12 12 16 14" stroke-width="1.75"/>
              </svg>
              <span class="text-[9px] font-bold text-[var(--color-text-muted)]">24 Saatlik</span>
              <span class="text-[10px] font-black text-[var(--color-text-secondary)]">Yoğunluk</span>
            </div>

            <svg
              ref="clockSvg"
              viewBox="0 0 360 280"
              class="w-full h-full overflow-visible select-none cursor-crosshair"
              @mousemove="handleClockMouseMove"
              @mouseleave="handleClockMouseLeave"
            >
              <!-- Background grid circles (Radar steps) -->
              <circle :cx="clockCx" :cy="clockCy" :r="clockRMin" fill="none" stroke="#F1F5F9" stroke-width="1" />
              <circle :cx="clockCx" :cy="clockCy" :r="(clockRMin + clockRMax) / 2" fill="none" stroke="#F1F5F9" stroke-width="1" stroke-dasharray="3" />
              <circle :cx="clockCx" :cy="clockCy" :r="clockRMax" fill="none" stroke="#F8FAFC" stroke-width="1.5" />

              <!-- Clock tick hour guidelines (Thin radiating lines) -->
              <line
                v-for="p in radialPoints"
                :key="`line-${p.hour}`"
                :x1="p.innerX"
                :y1="p.innerY"
                :x2="p.outerX"
                :y2="p.outerY"
                stroke="#F1F5F9"
                :stroke-width="p.hour % 6 === 0 ? '1.5' : '0.5'"
                :stroke-dasharray="p.hour % 6 === 0 ? 'none' : '2'"
              />

              <!-- Gradient Definition for Clock Radar Area -->
              <defs>
                <radialGradient id="clockGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="20%" stop-color="var(--color-primary)" stop-opacity="0.3"/>
                  <stop offset="100%" stop-color="var(--color-primary-light)" stop-opacity="0.05"/>
                </radialGradient>
              </defs>

              <!-- Radar Area Polygon -->
              <path
                v-if="radialPath && totalClockFilteredOrders > 0"
                :d="radialPath"
                fill="url(#clockGrad)"
                stroke="var(--color-primary)"
                stroke-width="2.5"
                stroke-linejoin="round"
                stroke-linecap="round"
                opacity="0.95"
              />

              <!-- Empty state within circle when no orders for selected day -->
              <circle
                v-if="totalClockFilteredOrders === 0"
                :cx="clockCx"
                :cy="clockCy"
                :r="clockRMin"
                fill="#FEF2F2"
                stroke="#FCA5A5"
                stroke-width="1"
                stroke-dasharray="2"
              />

              <!-- Outer Core clock text indicators -->
              <!-- 12 AM (Top) -->
              <text :x="clockCx" :y="clockCy - clockRMax - 10" text-anchor="middle" class="text-[9px] font-bold fill-[var(--color-text-muted)]">00:00</text>
              <!-- 6 AM (Right) -->
              <text :x="clockCx + clockRMax + 12" :y="clockCy + 3" text-anchor="start" class="text-[9px] font-bold fill-[var(--color-text-muted)]">06:00</text>
              <!-- 12 PM (Bottom) -->
              <text :x="clockCx" :y="clockCy + clockRMax + 18" text-anchor="middle" class="text-[9px] font-bold fill-[var(--color-text-muted)]">12:00</text>
              <!-- 6 PM (Left) -->
              <text :x="clockCx - clockRMax - 12" :y="clockCy + 3" text-anchor="end" class="text-[9px] font-bold fill-[var(--color-text-muted)]">18:00</text>

              <!-- Hover hour segment highlight -->
              <g v-if="activeRadialPoint && totalClockFilteredOrders > 0">
                <!-- Highlight line -->
                <line
                  :x1="activeRadialPoint.innerX"
                  :y1="activeRadialPoint.innerY"
                  :x2="activeRadialPoint.outerX"
                  :y2="activeRadialPoint.outerY"
                  stroke="var(--color-primary)"
                  stroke-width="2"
                  stroke-linecap="round"
                />
                <!-- Active dot pulsing glow -->
                <circle
                  :cx="activeRadialPoint.x"
                  :cy="activeRadialPoint.y"
                  r="6"
                  fill="var(--color-primary)"
                  opacity="0.25"
                  class="animate-ping"
                />
                <!-- Active dot -->
                <circle
                  :cx="activeRadialPoint.x"
                  :cy="activeRadialPoint.y"
                  r="4.5"
                  fill="white"
                  stroke="var(--color-primary)"
                  stroke-width="2.5"
                />
              </g>
            </svg>
          </div>

          <!-- Radar Statistics details -->
          <div class="flex-1 space-y-4">
            <h4 class="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Yoğunluk Özetleri</h4>
            
            <div class="space-y-3">
              <!-- No orders state -->
              <div v-if="totalClockFilteredOrders === 0" class="p-4 bg-red-50 rounded-xl border border-red-100 text-center text-xs text-red-700">
                Seçilen günde henüz sipariş bulunmuyor.
              </div>

              <template v-else>
                <!-- Peak hour card -->
                <div class="p-3 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-blue-500 text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">
                    🔥
                  </div>
                  <div>
                    <p class="text-[10px] font-bold text-blue-700">En Çok Sipariş Saati</p>
                    <p class="text-sm font-black text-slate-800">
                      {{ peakHour.hour }}:00 - {{ (peakHour.hour + 1) % 24 }}:00
                    </p>
                    <p class="text-[10px] text-slate-500 mt-0.5">Bu zaman diliminde toplam {{ peakHour.count }} sipariş alındı.</p>
                  </div>
                </div>

                <!-- General hour categories distribution -->
                <div class="grid grid-cols-2 gap-3 text-xs">
                  <div class="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <p class="text-[10px] font-bold text-[var(--color-text-muted)]">GÜNDÜZ (08-20)</p>
                    <p class="text-base font-black text-[var(--color-text-primary)] mt-0.5">
                      {{ hourlyCounts.slice(8, 20).reduce((a, b) => a + b, 0) }} Adet
                    </p>
                  </div>
                  <div class="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <p class="text-[10px] font-bold text-[var(--color-text-muted)]">GECE (20-08)</p>
                    <p class="text-base font-black text-[var(--color-text-primary)] mt-0.5">
                      {{ [...hourlyCounts.slice(20, 24), ...hourlyCounts.slice(0, 8)].reduce((a, b) => a + b, 0) }} Adet
                    </p>
                  </div>
                </div>
              </template>

              <p class="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
                * Seçilen zaman aralığındaki dağılıma göre Trendyol reklam bütçelerinizi yoğun saat dilimlerine odaklayabilirsiniz.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Top Selling Products (Takes 1 col) -->
      <div class="bg-white rounded-2xl border border-[var(--color-border)] p-5 flex flex-col justify-between">
        <div>
          <h3 class="text-sm font-bold text-[var(--color-text-primary)]">En Çok Satan Ürünler</h3>
          <p class="text-xs text-[var(--color-text-muted)] mt-0.5">Son 14 günün en popüler 5 ürünü</p>
        </div>

        <div class="my-4 flex-1 flex flex-col justify-center space-y-3.5">
          <div v-if="topProducts.length === 0" class="text-center py-8 text-xs text-[var(--color-text-muted)]">
            Satış verisi yok
          </div>
          <div
            v-for="prod in topProducts"
            :key="prod.name"
            class="space-y-1 group"
          >
            <div class="flex items-center justify-between text-xs font-semibold gap-3">
              <span class="text-[var(--color-text-secondary)] truncate flex-1 group-hover:text-[var(--color-primary)] transition-colors" :title="prod.name">
                {{ prod.name }}
              </span>
              <span class="text-[var(--color-text-primary)] whitespace-nowrap flex-shrink-0">
                {{ prod.quantity }} adet
              </span>
            </div>
            <!-- Progress Bar -->
            <div class="h-2 rounded-full bg-gray-100 overflow-hidden" aria-hidden="true">
              <div
                class="h-full rounded-full transition-all duration-300"
                :style="`width: ${(prod.quantity / maxProductQuantity) * 100}%; background: var(--color-primary);`"
              />
            </div>
            <p class="text-[9px] text-[var(--color-text-muted)] text-right font-medium">
              {{ formatCurrency(prod.revenue) }} ciro
            </p>
          </div>
        </div>

        <div class="text-[10px] text-center text-[var(--color-text-muted)] border-t border-gray-50 pt-2 font-medium">
          Toplam satılan adede göre sıralanmıştır
        </div>
      </div>

    </div>

    <!-- ─── Row 3: Cross-Sell & Geographic Analytics (NEW) ─── -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      <!-- Card 1: Co-Purchased Product Pairs -->
      <div class="bg-white rounded-2xl border border-[var(--color-border)] p-5 flex flex-col justify-between shadow-sm">
        <div>
          <h3 class="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <span>🤝 Birlikte En Çok Satılan Ürünler (Çapraz Satış)</span>
          </h3>
          <p class="text-xs text-[var(--color-text-muted)] mt-0.5">Aynı siparişte sepete birlikte eklenen popüler ürün çiftleri</p>
        </div>

        <div class="my-6 space-y-3 flex-1 flex flex-col justify-center">
          <div v-if="crossSellPairs.length === 0" class="text-center py-8 text-xs text-[var(--color-text-muted)] font-medium">
            Henüz yeterli çapraz satış verisi bulunmuyor (aynı siparişte birden fazla ürün içeren sipariş yok).
          </div>
          <div
            v-else
            v-for="pair in crossSellPairs"
            :key="`${pair.prodA}-${pair.prodB}`"
            class="p-3 border border-slate-100 hover:border-[var(--color-primary-lighter)] bg-slate-50/30 hover:bg-[var(--color-primary-lightest)] rounded-xl transition-all cursor-pointer group shadow-sm flex flex-col gap-1.5"
            @click="activePairDetail = pair"
            title="Sipariş detaylarını görüntülemek için tıklayın"
          >
            <div class="flex items-center justify-between text-xs font-semibold gap-3">
              <div class="flex items-center gap-1.5 min-w-0 flex-1">
                <span class="text-[var(--color-text-secondary)] font-extrabold truncate group-hover:text-[var(--color-primary)] transition-colors" :title="pair.prodA">
                  {{ pair.prodA }}
                </span>
                <span class="text-slate-400 font-normal">&amp;</span>
                <span class="text-[var(--color-text-secondary)] font-extrabold truncate group-hover:text-[var(--color-primary)] transition-colors" :title="pair.prodB">
                  {{ pair.prodB }}
                </span>
              </div>
              <span class="text-[var(--color-text-primary)] font-black whitespace-nowrap flex-shrink-0 flex items-center gap-1">
                <span class="text-[10px] text-[var(--color-text-muted)] font-normal">Sıklık:</span>
                {{ pair.count }} Kez
              </span>
            </div>
            <!-- Progress Bar -->
            <div class="h-1.5 rounded-full bg-slate-100 overflow-hidden" aria-hidden="true">
              <div
                class="h-full rounded-full transition-all duration-300 bg-indigo-500"
                :style="`width: ${(pair.count / maxPairCount) * 100}%;`"
              />
            </div>
          </div>
        </div>

        <div class="text-[10px] text-center text-[var(--color-text-muted)] border-t border-gray-50 pt-2 font-medium">
          💡 Detaylı sipariş analizi için listelenen kombinasyonlardan birine tıklayabilirsiniz.
        </div>
      </div>

      <!-- Card 2: Regional/City Product Preferences -->
      <div class="bg-white rounded-2xl border border-[var(--color-border)] p-5 flex flex-col justify-between shadow-sm">
        <div>
          <h3 class="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <span>📍 İllere Göre En Çok Tercih Edilen Ürünler</span>
          </h3>
          <p class="text-xs text-[var(--color-text-muted)] mt-0.5">Şehir bazında sipariş edilen en popüler ürünler</p>
        </div>

        <div class="my-4 space-y-4 flex-1 flex flex-col justify-between">
          <!-- Interactive Map Container -->
          <div class="bg-slate-50 border border-slate-100 rounded-2xl p-2 flex items-center justify-center min-h-[220px] shadow-sm relative">
            <TurkeyMap :city-sales="citySalesMap" @click-city="activeCityDetail = $event" />
          </div>

          <!-- Top Cities List -->
          <div class="space-y-3.5">
            <div v-if="cityProductSales.length === 0" class="text-center py-4 text-xs text-[var(--color-text-muted)] font-medium">
              Teslimat adresi veya şehir verisi bulunmuyor.
            </div>
            <div
              v-else
              v-for="item in cityProductSales.slice(0, 3)"
              :key="item.city"
              class="space-y-1 group text-xs font-semibold"
            >
              <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-2 min-w-0 flex-1">
                  <span class="inline-flex items-center justify-center px-2 py-0.5 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 font-extrabold text-[10px]">
                    {{ item.city }}
                  </span>
                  <span class="text-[var(--color-text-secondary)] font-bold truncate group-hover:text-[var(--color-primary)] transition-colors" :title="item.productName">
                    {{ item.productName }}
                  </span>
                </div>
                <span class="text-[var(--color-text-primary)] font-black whitespace-nowrap flex-shrink-0">
                  {{ item.quantity }} Adet
                </span>
              </div>
              <!-- Progress Bar -->
              <div class="h-1.5 rounded-full bg-gray-100 overflow-hidden" aria-hidden="true">
                <div
                  class="h-full rounded-full transition-all duration-300 bg-sky-500"
                  :style="`width: ${(item.quantity / maxCitySales) * 100}%;`"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="text-[10px] text-center text-[var(--color-text-muted)] border-t border-gray-50 pt-2 font-medium">
          Haritada aktif şehirlerin üzerine gelerek detayları (lider ürün ve toplam adedi) inceleyebilirsiniz.
        </div>
      </div>

    </div>

    <!-- ─── Cross Sell Detail Popup Modal ─── -->
    <div
      v-if="activePairDetail"
      class="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div class="bg-white rounded-3xl border border-[var(--color-border)] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
        
        <!-- Header -->
        <div class="p-6 border-b border-[var(--color-border)] flex items-center justify-between bg-slate-50">
          <div>
            <h3 class="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span>🤝 Çapraz Satış Detayı</span>
            </h3>
            <p class="text-xs text-[var(--color-text-muted)] mt-1">Birlikte satın alınan ürün kombinasyonu analizi</p>
          </div>
          <button
            type="button"
            class="w-8 h-8 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors flex items-center justify-center cursor-pointer"
            @click="activePairDetail = null"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="p-6 overflow-y-auto space-y-6 flex-1">
          
          <!-- Products Info Card -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center p-4 bg-blue-50/50 border border-blue-100 rounded-2xl">
            <div class="space-y-1">
              <span class="inline-flex px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 font-extrabold text-[9px] uppercase tracking-wider">A Ürünü</span>
              <p class="text-xs font-black text-slate-800 leading-snug">{{ activePairDetail.prodA }}</p>
            </div>
            <div class="space-y-1 border-t sm:border-t-0 sm:border-l border-blue-100 pt-3 sm:pt-0 sm:pl-4">
              <span class="inline-flex px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 font-extrabold text-[9px] uppercase tracking-wider">B Ürünü</span>
              <p class="text-xs font-black text-slate-800 leading-snug">{{ activePairDetail.prodB }}</p>
            </div>
          </div>

          <!-- Stats Grid -->
          <div class="grid grid-cols-3 gap-4">
            <div class="p-4 bg-gray-50 border border-gray-100 rounded-2xl text-center">
              <p class="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Birlikte Satış</p>
              <p class="text-xl font-black text-slate-800 mt-1">{{ selectedPairOrders.length }} Kez</p>
            </div>
            <div class="p-4 bg-gray-50 border border-gray-100 rounded-2xl text-center">
              <p class="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Toplam Sipariş Ciro</p>
              <p class="text-xl font-black text-emerald-600 mt-1">
                {{ formatCurrency(selectedPairTotalRevenue) }}
              </p>
            </div>
            <div class="p-4 bg-gray-50 border border-gray-100 rounded-2xl text-center">
              <p class="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Ort. Sipariş Tutarı</p>
              <p class="text-xl font-black text-slate-800 mt-1">
                {{ formatCurrency(selectedPairOrders.length > 0 ? selectedPairTotalRevenue / selectedPairOrders.length : 0) }}
              </p>
            </div>
          </div>

          <!-- Orders Table List -->
          <div class="space-y-3">
            <h4 class="text-xs font-bold text-slate-850 uppercase tracking-wider flex items-center gap-1.5">
              <span>📋 Sipariş Geçmişi (Son 14 Gün)</span>
            </h4>
            
            <div class="border border-[var(--color-border)] rounded-2xl overflow-hidden bg-white max-h-60 overflow-y-auto">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="bg-slate-50 text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider border-b border-[var(--color-border)] sticky top-0">
                    <th class="px-4 py-3 bg-slate-50">Sipariş No</th>
                    <th class="px-4 py-3 bg-slate-50">Tarih</th>
                    <th class="px-4 py-3 bg-slate-50">Şehir / Müşteri</th>
                    <th class="px-4 py-3 text-right bg-slate-50">Tutar</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[var(--color-border)] font-semibold text-[var(--color-text-secondary)]">
                  <tr v-for="o in selectedPairOrders" :key="o.orderId" class="hover:bg-slate-50 transition-colors">
                    <td class="px-4 py-3 font-mono text-[11px] text-[var(--color-primary)] font-bold">#{{ o.orderNumber }}</td>
                    <td class="px-4 py-3 text-slate-500">
                      {{ new Date(o.orderDate).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) }}
                    </td>
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-1.5">
                        <span class="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[9px] font-extrabold uppercase">{{ o.shipmentAddress?.city }}</span>
                        <span class="text-slate-700 truncate max-w-[120px]">{{ o.shipmentAddress?.firstName }} {{ o.shipmentAddress?.lastName?.charAt(0) }}.</span>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-right text-slate-900 font-extrabold">
                      {{ formatCurrency(o.grossAmount) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>

        <!-- Footer -->
        <div class="p-4 border-t border-[var(--color-border)] bg-slate-50 flex justify-end">
          <button
            type="button"
            class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
            @click="activePairDetail = null"
          >
            Kapat
          </button>
        </div>

      </div>
    </div>

    <!-- ─── City Detail Popup Modal ─── -->
    <div
      v-if="activeCityDetail"
      class="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div class="bg-white rounded-3xl border border-[var(--color-border)] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
        
        <!-- Header -->
        <div class="p-6 border-b border-[var(--color-border)] flex items-center justify-between bg-slate-50">
          <div>
            <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <span>📍 {{ activeCityDetail.name }} Şehri Sipariş Detayları</span>
            </h3>
            <p class="text-xs text-[var(--color-text-muted)] mt-1">Bu şehre gönderilen siparişler ve ürün tercihleri</p>
          </div>
          <button
            type="button"
            class="w-8 h-8 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors flex items-center justify-center cursor-pointer"
            @click="activeCityDetail = null"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="p-6 overflow-y-auto space-y-6 flex-1">
          
          <!-- Stats Summary Grid -->
          <div class="grid grid-cols-3 gap-4">
            <div class="p-4 bg-gray-50 border border-gray-100 rounded-2xl text-center">
              <p class="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Toplam Sipariş</p>
              <p class="text-xl font-black text-slate-800 mt-1">{{ selectedCityOrders.length }} Adet</p>
            </div>
            <div class="p-4 bg-gray-50 border border-gray-100 rounded-2xl text-center">
              <p class="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Toplam Ciro</p>
              <p class="text-xl font-black text-emerald-600 mt-1">
                {{ formatCurrency(selectedCityTotalRevenue) }}
              </p>
            </div>
            <div class="p-4 bg-gray-50 border border-gray-105 rounded-2xl text-center">
              <p class="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Ortalama Sipariş</p>
              <p class="text-xl font-black text-slate-800 mt-1">
                {{ formatCurrency(selectedCityOrders.length > 0 ? selectedCityTotalRevenue / selectedCityOrders.length : 0) }}
              </p>
            </div>
          </div>

          <!-- Product Sales breakdown in this city -->
          <div class="space-y-3">
            <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wider">📦 Tercih Edilen Ürünler (Satış Sıralı)</h4>
            <div v-if="selectedCityProducts.length === 0" class="text-xs text-slate-400 italic">
              Satılan ürün bulunmuyor.
            </div>
            <div v-else class="border border-[var(--color-border)] rounded-2xl overflow-hidden bg-white max-h-40 overflow-y-auto">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="bg-slate-50 text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider border-b border-[var(--color-border)] sticky top-0">
                    <th class="px-4 py-2.5 bg-slate-50">Ürün Adı</th>
                    <th class="px-4 py-2.5 text-center bg-slate-50">Adet</th>
                    <th class="px-4 py-2.5 text-right bg-slate-50">Ciro</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[var(--color-border)] font-semibold text-[var(--color-text-secondary)]">
                  <tr v-for="p in selectedCityProducts" :key="p.name" class="hover:bg-slate-50 transition-colors">
                    <td class="px-4 py-2.5 text-slate-700 truncate max-w-[340px]" :title="p.name">{{ p.name }}</td>
                    <td class="px-4 py-2.5 text-center text-slate-900 font-extrabold">{{ p.quantity }} Adet</td>
                    <td class="px-4 py-2.5 text-right text-emerald-600 font-extrabold">{{ formatCurrency(p.revenue) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Orders Table List in this city -->
          <div class="space-y-3">
            <h4 class="text-xs font-bold text-slate-850 uppercase tracking-wider flex items-center gap-1.5">
              <span>📋 Sipariş Geçmişi</span>
            </h4>
            
            <div class="border border-[var(--color-border)] rounded-2xl overflow-hidden bg-white max-h-60 overflow-y-auto">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="bg-slate-50 text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider border-b border-[var(--color-border)] sticky top-0">
                    <th class="px-4 py-3 bg-slate-50">Sipariş No</th>
                    <th class="px-4 py-3 bg-slate-50">Tarih</th>
                    <th class="px-4 py-3 bg-slate-50">Müşteri</th>
                    <th class="px-4 py-3 text-right bg-slate-50">Tutar</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[var(--color-border)] font-semibold text-[var(--color-text-secondary)]">
                  <tr v-for="o in selectedCityOrders" :key="o.orderId" class="hover:bg-slate-50 transition-colors">
                    <td class="px-4 py-3 font-mono text-[11px] text-[var(--color-primary)] font-bold">#{{ o.orderNumber }}</td>
                    <td class="px-4 py-3 text-slate-500">
                      {{ new Date(o.orderDate).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) }}
                    </td>
                    <td class="px-4 py-3 text-slate-700">
                      {{ o.shipmentAddress?.firstName }} {{ o.shipmentAddress?.lastName?.charAt(0) }}.
                    </td>
                    <td class="px-4 py-3 text-right text-slate-900 font-extrabold">
                      {{ formatCurrency(o.grossAmount) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>

        <!-- Footer -->
        <div class="p-4 border-t border-[var(--color-border)] bg-slate-50 flex justify-end">
          <button
            type="button"
            class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
            @click="activeCityDetail = null"
          >
            Kapat
          </button>
        </div>

      </div>
    </div>

  </div>
</template>

<style scoped>
.metric-card {
  background: white;
  border: 1px solid var(--color-border);
  border-radius: 1rem;
  padding: 1.25rem;
  transition: all 0.2s ease;
}
.metric-card:hover {
  box-shadow: 0 4px 12px rgba(37,99,235,0.04);
  border-color: var(--color-primary-lighter);
}
</style>
