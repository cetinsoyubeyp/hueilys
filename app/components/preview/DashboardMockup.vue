<script setup lang="ts">
/**
 * DashboardMockup — Pure HTML/CSS/SVG dashboard preview.
 * Represents real dashboard aesthetics, matching the actual layout and Pano page.
 */

// Mock nav items
const navItems = [
  { label: 'Pano', icon: 'grid', active: true },
  { label: 'Siparişler', icon: 'box', active: false },
  { label: 'Fiyatlandırma', icon: 'tag', active: false },
  { label: 'YZ Destekli Öneriler', icon: 'sparkles', active: false }
]

const bottomItems = [
  { label: 'Ayarlar', icon: 'settings', soon: true }
]
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
    <div class="bg-[#F0F4FF] flex" style="min-height: 480px;">
      <!-- Sidebar -->
      <aside class="hidden md:flex flex-col w-56 bg-white border-r border-[var(--color-border)] py-5 flex-shrink-0" aria-hidden="true">
        <!-- Logo -->
        <div class="flex items-center gap-2.5 px-5 pb-5 border-b border-[var(--color-border)] mb-4">
          <div class="w-8 h-8 rounded-xl bg-[var(--color-primary)] flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M3 13L6.5 7.5L9.5 10.5L13 5L15 13" stroke="white" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="15" cy="5" r="1.25" fill="#93C5FD"/>
            </svg>
          </div>
          <span class="font-bold text-[var(--color-text-primary)] text-sm tracking-tight">Hueilys</span>
        </div>

        <!-- Nav -->
        <nav class="flex-1 px-3 py-2 space-y-0.5">
          <div
            v-for="item in navItems"
            :key="item.label"
            :class="[
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150',
              item.active
                ? 'bg-[var(--color-primary-lightest)] text-[var(--color-primary)]'
                : 'text-[var(--color-text-secondary)] hover:bg-gray-50'
            ]"
          >
            <!-- SVG Icon inline -->
            <svg v-if="item.icon === 'grid'" class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            <svg v-else-if="item.icon === 'box'" class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
            <svg v-else-if="item.icon === 'tag'" class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
            <svg v-else-if="item.icon === 'sparkles'" class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="m5 3 3 .5L5 4 4.5 7 4 4 1 3.5 4 3 4.5 0 5 3Z"/><path d="m19 17 3 .5-3 .5-.5 3-.5-3-3-.5 3-.5.5-3 .5 3Z"/></svg>
            <span class="flex-1">{{ item.label }}</span>
          </div>
        </nav>

        <!-- Bottom items -->
        <div class="px-3 py-4 border-t border-[var(--color-border)] space-y-0.5">
          <div
            v-for="item in bottomItems"
            :key="item.label"
            class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-[var(--color-text-muted)] opacity-60"
          >
            <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
            <span class="flex-1 text-[11px]">{{ item.label }}</span>
            <span class="text-[8px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-400">Yakında</span>
          </div>

          <!-- User Section -->
          <div class="flex items-center gap-2.5 px-3 py-2.5 mt-1 rounded-xl hover:bg-gray-50 cursor-pointer">
            <div class="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[#7C3AED] flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
              ÇS
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-[10px] font-bold text-[var(--color-text-primary)] truncate">Çetin Soyubey</p>
              <p class="text-[9px] text-[var(--color-text-muted)]">Çıkış Yap</p>
            </div>
          </div>
        </div>
      </aside>

      <!-- Main Content Area -->
      <main class="flex-1 flex flex-col overflow-hidden">
        <!-- Header -->
        <header class="h-14 bg-white border-b border-[var(--color-border)] flex items-center justify-between px-6 flex-shrink-0">
          <div>
            <p class="text-sm font-semibold text-[var(--color-text-primary)]">Pano</p>
          </div>
          <div class="flex items-center gap-3">
            <!-- Credit Badge representation -->
            <div class="mock-credit-badge">
              <!-- Coin icon -->
              <svg class="mcb-icon" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm0 2c1.657 0 3 .672 3 1.5S11.657 7 10 7 7 6.328 7 5.5 8.343 4 10 4zm0 9c-2.21 0-4-.9-4-2v-1c.87.7 2.3 1 4 1s3.13-.3 4-1v1c0 1.1-1.79 2-4 2zm0-4c-2.21 0-4-.9-4-2v-1c.87.7 2.3 1 4 1s3.13-.3 4-1v1c0 1.1-1.79 2-4 2z"/>
              </svg>
              <span class="mcb-balance">100.0</span>
              <span class="mcb-label">Kredi</span>
              <span class="mcb-plus">
                <svg viewBox="0 0 12 12" fill="currentColor">
                  <path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </span>
            </div>

            <!-- Bell Icon -->
            <div class="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-[var(--color-text-muted)]">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
              </svg>
            </div>
          </div>
        </header>

        <!-- Main Body (Store cards) -->
        <div class="flex-1 p-6 overflow-y-auto">
          <!-- Page header inside page -->
          <div class="flex items-center justify-between mb-6">
            <div>
              <h2 class="text-base font-bold text-[var(--color-text-primary)]">Pano</h2>
              <p class="text-xs text-[var(--color-text-muted)] mt-0.5">2 mağaza bağlı</p>
            </div>
            <div class="btn btn-primary px-3.5 py-1.5 text-xs gap-1.5 font-bold cursor-default">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19" stroke-linecap="round"/>
                <line x1="5" y1="12" x2="19" y2="12" stroke-linecap="round"/>
              </svg>
              Mağaza Ekle
            </div>
          </div>

          <!-- Store cards grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Trendyol Store Card -->
            <div class="bg-white rounded-xl border border-[var(--color-border)] p-4 shadow-sm hover:shadow-md transition-shadow">
              <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-lg text-white font-black text-xs flex items-center justify-center bg-[#F27A1A]">
                    T
                  </div>
                  <div>
                    <p class="font-bold text-xs text-[var(--color-text-primary)]">Trendyol Kozmetik</p>
                    <p class="text-[10px] text-[var(--color-text-muted)]">Trendyol</p>
                  </div>
                </div>
                <!-- Active badge -->
                <span class="flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Aktif
                </span>
              </div>
              <div class="text-[10px] text-[var(--color-text-muted)]">
                Bağlantı: 08.07.2026
              </div>
            </div>

            <!-- Hepsiburada Store Card -->
            <div class="bg-white rounded-xl border border-[var(--color-border)] p-4 shadow-sm hover:shadow-md transition-shadow">
              <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-lg text-white font-black text-xs flex items-center justify-center bg-[#FF6000]">
                    H
                  </div>
                  <div>
                    <p class="font-bold text-xs text-[var(--color-text-primary)]">Hepsiburada Giyim</p>
                    <p class="text-[10px] text-[var(--color-text-muted)]">Hepsiburada</p>
                  </div>
                </div>
                <!-- Active badge -->
                <span class="flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Aktif
                </span>
              </div>
              <div class="text-[10px] text-[var(--color-text-muted)]">
                Bağlantı: 08.07.2026
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.mock-credit-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px 4px 6px;
  border-radius: 8px;
  border: 1.5px solid rgba(99, 102, 241, 0.25);
  background: linear-gradient(135deg, rgba(99,102,241,0.07) 0%, rgba(139,92,246,0.06) 100%);
  color: #2563eb;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}
.mcb-icon {
  width: 12px;
  height: 12px;
  opacity: 0.9;
}
.mcb-balance {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: -0.2px;
}
.mcb-label {
  font-size: 8px;
  font-weight: 600;
  opacity: 0.75;
  margin-left: -2px;
}
.mcb-plus {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  background: currentColor;
  border-radius: 3px;
  margin-left: 2px;
  opacity: 0.15;
}
.mcb-plus svg {
  width: 6px;
  height: 6px;
  color: white;
}
</style>
