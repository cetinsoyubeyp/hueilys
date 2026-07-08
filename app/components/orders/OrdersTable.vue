<script setup lang="ts">
/**
 * OrdersTable — Renders a list of Trendyol orders in a clean table.
 * Includes per-row expand for product lines.
 */

import type { TrendyolOrder } from '~/types'

defineProps<{ orders: TrendyolOrder[] }>()

const expandedRows = ref<Set<string | number>>(new Set())

function toggleRow(orderId: string | number) {
  if (expandedRows.value.has(orderId)) {
    expandedRows.value.delete(orderId)
  }
  else {
    expandedRows.value.add(orderId)
  }
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('tr-TR', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
    hour:  '2-digit',
    minute:'2-digit',
  })
}

function formatCurrency(amount: number, currency = 'TRY'): string {
  return new Intl.NumberFormat('tr-TR', {
    style:    'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount)
}
</script>

<template>
  <div class="bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden">
    <table class="w-full text-sm" aria-label="Sipariş listesi">
      <thead>
        <tr class="bg-[#F8FAFF] border-b border-[var(--color-border)]">
          <th class="w-8 px-3 py-3" aria-label="Genişlet" />
          <th class="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Sipariş No</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Tarih</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Müşteri</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Ürünler</th>
          <th class="px-4 py-3 text-right text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Tutar</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Kargo</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Durum</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="order in orders" :key="order.orderId || order.id || order.orderNumber">
          <!-- Main row -->
          <tr
            class="border-b border-[var(--color-border)] hover:bg-[#F8FAFF] transition-colors cursor-pointer"
            @click="toggleRow(order.orderId || order.id || order.orderNumber)"
          >
            <!-- Expand toggle -->
            <td class="px-3 py-3.5 text-[var(--color-text-muted)]">
              <svg
                class="w-4 h-4 transition-transform duration-200"
                :class="expandedRows.has(order.orderId || order.id || order.orderNumber) ? 'rotate-90' : ''"
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </td>

            <!-- Order number -->
            <td class="px-4 py-3.5">
              <span class="font-mono text-xs font-semibold text-[var(--color-primary)]">
                #{{ order.orderNumber }}
              </span>
              <div v-if="order.fastDelivery" class="mt-0.5">
                <span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">⚡ Hızlı</span>
              </div>
            </td>

            <!-- Date -->
            <td class="px-4 py-3.5 text-[var(--color-text-secondary)] text-xs whitespace-nowrap">
              {{ formatDate(order.orderDate) }}
            </td>

            <!-- Customer -->
            <td class="px-4 py-3.5">
              <p class="font-medium text-[var(--color-text-primary)] text-sm">
                {{ order.shipmentAddress.firstName }} {{ order.shipmentAddress.lastName }}
              </p>
              <p class="text-xs text-[var(--color-text-muted)] mt-0.5">
                {{ order.shipmentAddress.district }}, {{ order.shipmentAddress.city }}
              </p>
            </td>

            <!-- Products summary -->
            <td class="px-4 py-3.5">
              <p class="text-[var(--color-text-primary)] text-sm font-medium">
                {{ order.lines.length }} ürün
              </p>
              <p class="text-xs text-[var(--color-text-muted)] mt-0.5 truncate max-w-[160px]">
                {{ order.lines[0]?.productName }}
                <span v-if="order.lines.length > 1"> +{{ order.lines.length - 1 }}</span>
              </p>
            </td>

            <!-- Amount -->
            <td class="px-4 py-3.5 text-right">
              <p class="font-semibold text-[var(--color-text-primary)] text-sm">
                {{ formatCurrency(order.grossAmount, order.lines[0]?.currencyCode) }}
              </p>
              <p v-if="order.totalDiscount > 0" class="text-xs text-emerald-600 mt-0.5">
                -{{ formatCurrency(order.totalDiscount, order.lines[0]?.currencyCode) }}
              </p>
            </td>

            <!-- Cargo -->
            <td class="px-4 py-3.5">
              <p v-if="order.cargoProviderName" class="text-xs font-medium text-[var(--color-text-secondary)]">
                {{ order.cargoProviderName }}
              </p>
              <p v-if="order.cargoTrackingNumber" class="text-xs text-[var(--color-text-muted)] font-mono mt-0.5">
                {{ order.cargoTrackingNumber }}
              </p>
              <p v-if="!order.cargoProviderName" class="text-xs text-[var(--color-text-muted)]">—</p>
            </td>

            <!-- Status -->
            <td class="px-4 py-3.5">
              <OrderStatusBadge :status="order.shipmentPackageStatus || order.status" />
            </td>
          </tr>

          <!-- Expanded: product lines -->
          <tr v-if="expandedRows.has(order.orderId || order.id || order.orderNumber)" :key="`${order.orderId || order.id || order.orderNumber}-detail`">
            <td colspan="8" class="bg-[#F8FAFF] border-b border-[var(--color-border)] px-8 py-4">
              <div class="space-y-2">
                <p class="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">Sipariş Kalemleri</p>
                <div
                  v-for="line in order.lines"
                  :key="line.lineId"
                  class="flex items-center gap-4 bg-white rounded-xl p-3 border border-[var(--color-border)]"
                >
                  <!-- Product image placeholder -->
                  <div class="w-10 h-10 rounded-lg bg-[var(--color-primary-lightest)] flex items-center justify-center flex-shrink-0">
                    <svg class="w-5 h-5 text-[var(--color-primary-lighter)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"/>
                    </svg>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-[var(--color-text-primary)] truncate">{{ line.productName }}</p>
                    <p class="text-xs text-[var(--color-text-muted)] mt-0.5">
                      SKU: {{ line.merchantSku || line.barcode }}
                      <span v-if="line.productSize"> · Beden: {{ line.productSize }}</span>
                      <span v-if="line.productColor"> · Renk: {{ line.productColor }}</span>
                    </p>
                  </div>
                  <div class="text-right flex-shrink-0">
                    <p class="text-sm font-semibold text-[var(--color-text-primary)]">{{ formatCurrency(line.amount, line.currencyCode) }}</p>
                    <p class="text-xs text-[var(--color-text-muted)] mt-0.5">x{{ line.quantity }}</p>
                  </div>
                </div>
              </div>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>
