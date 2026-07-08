<script setup lang="ts">
/**
 * OrderStatusBadge — Visual badge for Trendyol order statuses.
 */

import type { TrendyolOrderStatus } from '~/types'

defineProps<{ status: TrendyolOrderStatus | string }>()

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  Created:          { label: 'Yeni Sipariş',           class: 'badge-blue'    },
  Picking:          { label: 'Hazırlanıyor',            class: 'badge-yellow'  },
  Invoiced:         { label: 'Faturalandı',             class: 'badge-purple'  },
  Shipped:          { label: 'Kargoya Verildi',         class: 'badge-indigo'  },
  Delivered:        { label: 'Teslim Edildi',           class: 'badge-green'   },
  Cancelled:        { label: 'İptal Edildi',            class: 'badge-red'     },
  UnDelivered:      { label: 'Teslim Edilemedi',        class: 'badge-orange'  },
  Returned:         { label: 'İade Edildi',             class: 'badge-orange'  },
  WaitingForSupply: { label: 'Tedarik Bekleniyor',      class: 'badge-yellow'  },
  PickupPoint:      { label: 'Teslim Noktasında',       class: 'badge-indigo'  },
}
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap',
      STATUS_MAP[status]?.class ?? 'badge-gray',
    ]"
  >
    <span class="w-1.5 h-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
    {{ STATUS_MAP[status]?.label ?? status }}
  </span>
</template>

<style scoped>
.badge-blue    { background:#EFF6FF; color:#1D4ED8; }
.badge-yellow  { background:#FEFCE8; color:#A16207; }
.badge-purple  { background:#FAF5FF; color:#6D28D9; }
.badge-indigo  { background:#EEF2FF; color:#4338CA; }
.badge-green   { background:#F0FDF4; color:#15803D; }
.badge-red     { background:#FFF1F2; color:#BE123C; }
.badge-orange  { background:#FFF7ED; color:#C2410C; }
.badge-gray    { background:#F1F5F9; color:#475569; }
</style>
