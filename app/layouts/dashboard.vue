<script setup lang="ts">
/**
 * dashboard.vue — Dashboard layout.
 * Sidebar navigation + top header with user info.
 * Used by all dashboard pages via definePageMeta({ layout: 'dashboard' }).
 */

const { user, signOut } = useAuth()
const route = useRoute()

const navItems = [
  { label: 'Pano',                href: '/dashboard',                 icon: 'grid' },
  { label: 'Siparişler',          href: '/dashboard/orders',          icon: 'box' },
  { label: 'Fiyatlandırma',       href: '/dashboard/pricing',         icon: 'tag' },
  { label: 'YZ Destekli Öneriler', href: '/dashboard/recommendations', icon: 'sparkles' },
  { label: 'Yardım Kitapçığı',    href: '/dashboard/help',            icon: 'book' },
]

const bottomItems = [
  { label: 'Ayarlar', href: '/dashboard/settings', icon: 'settings', soon: true },
]

// User initials for avatar
const initials = computed(() => {
  const name = user.value?.user_metadata?.full_name as string | undefined
  if (!name) return user.value?.email?.[0]?.toUpperCase() ?? '?'
  return name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
})

const isSidebarOpen = ref(false)
const isCreditsModalOpen = ref(false)

async function handleSignOut() {
  await signOut()
  navigateTo('/')
}
</script>

<template>
  <div class="flex h-screen bg-[#F0F4FF] overflow-hidden">

    <!-- ─── Sidebar ──────────────────────────────────────────────────────────── -->
    <aside
      :class="[
        'flex flex-col bg-white border-r border-[var(--color-border)] z-30',
        'transition-all duration-300 flex-shrink-0',
        'w-60',
      ]"
    >
      <!-- Logo -->
      <div class="flex items-center gap-2.5 px-5 py-5 border-b border-[var(--color-border)]">
        <div class="w-8 h-8 rounded-xl bg-[var(--color-primary)] flex items-center justify-center flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M3 13L6.5 7.5L9.5 10.5L13 5L15 13" stroke="white" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="15" cy="5" r="1.25" fill="#93C5FD"/>
          </svg>
        </div>
        <span class="font-bold text-[var(--color-text-primary)] text-sm tracking-tight">Hueilys</span>
      </div>

      <!-- Nav -->
      <nav class="flex-1 px-3 py-4 overflow-y-auto">
        <div class="space-y-0.5">
          <NuxtLink
            v-for="item in navItems"
            :key="item.href"
            :to="item.soon ? undefined : item.href"
            :class="[
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative',
              !item.soon && route.path === item.href
                ? 'bg-[var(--color-primary-lightest)] text-[var(--color-primary)]'
                : item.soon
                  ? 'text-[var(--color-text-muted)] cursor-default opacity-60'
                  : 'text-[var(--color-text-secondary)] hover:bg-gray-50 hover:text-[var(--color-text-primary)]',
            ]"
            :aria-current="route.path === item.href ? 'page' : undefined"
          >
            <!-- Icon -->
            <DashboardNavIcon :icon="item.icon" class="w-4 h-4 flex-shrink-0" />
            <span class="flex-1">{{ item.label }}</span>
            <!-- Soon badge -->
            <span
              v-if="item.soon"
              class="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-400"
            >
              Yakında
            </span>
          </NuxtLink>
        </div>
      </nav>

      <!-- Bottom -->
      <div class="px-3 py-4 border-t border-[var(--color-border)] space-y-0.5">
        <NuxtLink
          v-for="item in bottomItems"
          :key="item.href"
          :to="item.soon ? undefined : item.href"
          :class="[
            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
            item.soon
              ? 'text-[var(--color-text-muted)] cursor-default opacity-60'
              : 'text-[var(--color-text-secondary)] hover:bg-gray-50',
          ]"
        >
          <DashboardNavIcon :icon="item.icon" class="w-4 h-4 flex-shrink-0" />
          <span class="flex-1">{{ item.label }}</span>
          <span v-if="item.soon" class="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-400">Yakında</span>
        </NuxtLink>

        <!-- User section -->
        <div class="flex items-center gap-3 px-3 py-2.5 mt-1 rounded-xl hover:bg-gray-50 cursor-pointer group" @click="handleSignOut">
          <div class="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[#7C3AED] flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
            {{ initials }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-semibold text-[var(--color-text-primary)] truncate">
              {{ user?.user_metadata?.full_name || user?.email }}
            </p>
            <p class="text-[10px] text-[var(--color-text-muted)] group-hover:text-red-500 transition-colors">
              Çıkış Yap
            </p>
          </div>
        </div>
      </div>
    </aside>

    <!-- ─── Main ─────────────────────────────────────────────────────────────── -->
    <div class="flex-1 flex flex-col overflow-hidden">

      <!-- Top bar -->
      <header class="h-14 bg-white border-b border-[var(--color-border)] flex items-center justify-between px-6 flex-shrink-0">
        <div>
          <p class="text-sm font-semibold text-[var(--color-text-primary)]">
            {{ navItems.find(n => n.href === route.path)?.label ?? 'Pano' }}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <!-- Credit Badge -->
          <CreditBadge @open-modal="isCreditsModalOpen = true" />

          <!-- Notification bell placeholder -->
          <button
            type="button"
            class="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-[var(--color-text-muted)] transition-colors"
            aria-label="Bildirimler"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
            </svg>
          </button>
        </div>
      </header>

      <!-- Page content -->
      <main class="flex-1 overflow-y-auto">
        <slot />
      </main>
    </div>
  </div>

  <!-- Credit Modal (global, outside layout grid) -->
  <CreditModal
    v-if="isCreditsModalOpen"
    @close="isCreditsModalOpen = false"
  />
</template>
