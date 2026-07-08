<script setup lang="ts">
/**
 * DashboardMockup — Pure HTML/CSS/SVG dashboard preview.
 * Represents real dashboard aesthetics without actual data connections.
 */

import type { StatCard } from '~/types'

const stats: StatCard[] = [
  { label: 'Toplam Gelir', value: '284.231 ₺', change: '+18,2%', trend: 'up' },
  { label: 'Siparişler', value: '3.847', change: '+12,5%', trend: 'up' },
  { label: 'Müşteriler', value: '12.400', change: '+8,1%', trend: 'up' },
  { label: 'Ort. Sipariş Değeri', value: '73,8 ₺', change: '-2,3%', trend: 'down' },
]

// Sparkline data points (normalised 0-40)
const revenuePoints = [12, 20, 15, 28, 22, 35, 30, 38, 32, 40]
const ordersPoints = [8, 14, 10, 20, 18, 25, 22, 28, 24, 30]

function buildSparklinePath(points: number[], width: number, height: number): string {
  const step = width / (points.length - 1)
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${height - (p / 40) * height}`)
    .join(' ')
}

const revenuePath = buildSparklinePath(revenuePoints, 120, 40)
const ordersPath = buildSparklinePath(ordersPoints, 120, 40)

// Bar chart data (monthly, normalised 0-100)
const barData = [55, 72, 61, 80, 74, 90, 83, 95, 78, 88, 92, 100]
const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
</script>

<template>
  <div
    class="relative w-full max-w-5xl mx-auto rounded-2xl overflow-hidden"
    style="box-shadow: 0 0 0 1px rgba(37,99,235,0.1), 0 32px 80px rgba(37,99,235,0.12), 0 8px 24px rgba(0,0,0,0.06);"
    aria-label="Dashboard preview mockup"
    role="img"
  >
    <!-- Browser chrome bar -->
    <div class="bg-[#F1F5F9] border-b border-[var(--color-border)] px-4 py-3 flex items-center gap-3">
      <div class="flex gap-1.5" aria-hidden="true">
        <div class="w-3 h-3 rounded-full bg-[#FF5F57]" />
        <div class="w-3 h-3 rounded-full bg-[#FEBC2E]" />
        <div class="w-3 h-3 rounded-full bg-[#28C840]" />
      </div>
      <div class="flex-1 max-w-xs mx-auto">
        <div class="bg-white rounded-md px-3 py-1 text-xs text-[var(--color-text-muted)] border border-[var(--color-border)] text-center">
          app.hueilys.com/dashboard
        </div>
      </div>
    </div>

    <!-- Dashboard body -->
    <div class="bg-[#F8FAFF] flex" style="min-height: 480px;">
      <!-- Sidebar -->
      <aside class="hidden md:flex flex-col w-14 lg:w-52 bg-white border-r border-[var(--color-border)] py-5 flex-shrink-0" aria-hidden="true">
        <!-- Logo -->
        <div class="px-4 mb-6 flex items-center gap-2">
          <div class="w-7 h-7 rounded-lg bg-[var(--color-primary)] flex-shrink-0" />
          <span class="hidden lg:block text-sm font-bold text-[var(--color-text-primary)]">Hueilys</span>
        </div>

        <!-- Nav items -->
        <nav class="flex flex-col gap-1 px-2">
          <template v-for="(item, i) in ['Pano', 'Analitik', 'Siparişler', 'Ürünler', 'Stok', 'YZ Önerileri']" :key="item">
            <div
              :class="[
                'flex items-center gap-2.5 px-2 py-2 rounded-lg text-xs font-medium transition-colors',
                i === 0
                  ? 'bg-[var(--color-primary-lightest)] text-[var(--color-primary)]'
                  : 'text-[var(--color-text-muted)] hover:bg-gray-50'
              ]"
            >
              <div :class="['w-4 h-4 rounded flex-shrink-0', i === 0 ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]']" style="opacity: 0.7" />
              <span class="hidden lg:block">{{ item }}</span>
            </div>
          </template>
        </nav>
      </aside>

      <!-- Main dashboard content -->
      <main class="flex-1 p-5 lg:p-6 overflow-hidden">
        <!-- Page header -->
        <div class="flex items-center justify-between mb-5" aria-hidden="true">
          <div>
            <div class="text-sm font-bold text-[var(--color-text-primary)]">Pano</div>
            <div class="text-xs text-[var(--color-text-muted)]">Temmuz 2025 · Tüm pazaryerleri</div>
          </div>
          <div class="flex items-center gap-2">
            <div class="bg-white border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs text-[var(--color-text-secondary)]">Son 30 gün ▾</div>
            <div class="bg-[var(--color-primary)] rounded-lg px-3 py-1.5 text-xs text-white font-medium">Dışa Aktar</div>
          </div>
        </div>

        <!-- Stat cards row -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5" aria-hidden="true">
          <div
            v-for="stat in stats"
            :key="stat.label"
            class="bg-white rounded-xl p-4 border border-[var(--color-border)]"
          >
            <div class="text-xs text-[var(--color-text-muted)] mb-1">{{ stat.label }}</div>
            <div class="text-base font-bold text-[var(--color-text-primary)] mb-1">{{ stat.value }}</div>
            <div
              :class="['text-xs font-semibold', stat.trend === 'up' ? 'text-emerald-600' : 'text-red-500']"
            >
              {{ stat.change }}
              <span class="text-[var(--color-text-muted)] font-normal ml-1">geçen aya göre</span>
            </div>
          </div>
        </div>

        <!-- Charts row -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <!-- Revenue chart (bar) - takes 2 cols -->
          <div class="lg:col-span-2 bg-white rounded-xl p-4 border border-[var(--color-border)]" aria-hidden="true">
            <div class="flex items-center justify-between mb-4">
              <div class="text-xs font-semibold text-[var(--color-text-primary)]">Aylık Gelir</div>
              <div class="text-xs text-[var(--color-primary)] font-medium">↗ 18.2%</div>
            </div>
            <!-- Bar chart -->
            <div class="flex items-end gap-1.5 h-28">
              <div
                v-for="(bar, i) in barData"
                :key="i"
                class="flex-1 flex flex-col items-center gap-1"
              >
                <div
                  class="w-full rounded-t-sm transition-all"
                  :style="`height: ${bar * 0.9}%; background: ${i === barData.length - 1 ? 'var(--color-primary)' : 'var(--color-primary-lighter)'};`"
                />
                <div class="text-[9px] text-[var(--color-text-muted)]">{{ months[i] }}</div>
              </div>
            </div>
          </div>

          <!-- Sparklines column -->
          <div class="flex flex-col gap-3">
            <!-- Revenue sparkline -->
            <div class="bg-white rounded-xl p-4 border border-[var(--color-border)]" aria-hidden="true">
              <div class="text-xs text-[var(--color-text-muted)] mb-1">Gelir Trendi</div>
              <div class="text-sm font-bold text-[var(--color-text-primary)] mb-2">$84,231</div>
              <svg viewBox="0 0 120 40" class="w-full h-10">
                <path :d="revenuePath" fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path :d="`${revenuePath} L 120 40 L 0 40 Z`" fill="url(#gradBlue)" opacity="0.2"/>
                <defs>
                  <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="var(--color-primary)" stop-opacity="0.5"/>
                    <stop offset="100%" stop-color="var(--color-primary)" stop-opacity="0"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <!-- Orders sparkline -->
            <div class="bg-white rounded-xl p-4 border border-[var(--color-border)]" aria-hidden="true">
              <div class="text-xs text-[var(--color-text-muted)] mb-1">Sipariş Trendi</div>
              <div class="text-sm font-bold text-[var(--color-text-primary)] mb-2">3,847</div>
              <svg viewBox="0 0 120 40" class="w-full h-10">
                <path :d="ordersPath" fill="none" stroke="#7C3AED" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path :d="`${ordersPath} L 120 40 L 0 40 Z`" fill="url(#gradPurple)" opacity="0.2"/>
                <defs>
                  <linearGradient id="gradPurple" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#7C3AED" stop-opacity="0.5"/>
                    <stop offset="100%" stop-color="#7C3AED" stop-opacity="0"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>
