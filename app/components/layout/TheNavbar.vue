<script setup lang="ts">
/**
 * TheNavbar — Sticky navigation bar with scroll-blur effect.
 * Mobile-responsive with animated drawer menu.
 */

import { NAV_ITEMS, APP_NAME } from '~/constants'

const isScrolled = ref(false)
const isMobileMenuOpen = ref(false)

// Track scroll position for blur effect
const { y: scrollY } = useWindowScroll()
watchEffect(() => {
  isScrolled.value = scrollY.value > 20
})

// Close mobile menu on route change
const route = useRoute()
watch(() => route.path, () => {
  isMobileMenuOpen.value = false
})

// Prevent body scroll when mobile menu is open
watchEffect(() => {
  if (import.meta.client) {
    document.body.style.overflow = isMobileMenuOpen.value ? 'hidden' : ''
  }
})

function toggleMobileMenu() {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

function closeMenu() {
  isMobileMenuOpen.value = false
}
</script>

<template>
  <header
    :class="[
      'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
      isScrolled
        ? 'bg-white/80 backdrop-blur-xl border-b border-[var(--color-border)] shadow-sm'
        : 'bg-transparent',
    ]"
    role="banner"
  >
    <nav
      class="container-app flex items-center justify-between"
      style="height: var(--navbar-height)"
      aria-label="Main navigation"
    >
      <!-- Logo -->
      <a
        href="#home"
        class="flex items-center gap-2 font-bold text-xl text-[var(--color-text-primary)] no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded-md"
        :aria-label="`${APP_NAME} — Home`"
      >
        <div class="w-8 h-8 rounded-lg bg-[var(--color-primary)] flex items-center justify-center flex-shrink-0">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M3 13L6.5 7.5L9.5 10.5L13 5L15 13" stroke="white" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="15" cy="5" r="1.25" fill="#93C5FD"/>
          </svg>
        </div>
        <span>{{ APP_NAME }}</span>
      </a>

      <!-- Desktop Nav Links -->
      <ul class="hidden md:flex items-center gap-1 list-none m-0 p-0" role="list">
        <li v-for="item in NAV_ITEMS" :key="item.label">
          <a
            :href="item.href"
            class="px-3.5 py-2 rounded-lg text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-lightest)] transition-all duration-150 no-underline block"
          >
            {{ item.label }}
          </a>
        </li>
      </ul>

      <!-- Desktop CTA Buttons -->
      <div class="hidden md:flex items-center gap-2">
        <a
          href="#login"
          class="btn btn-ghost px-4 py-2 text-sm"
        >
          Login
        </a>
        <a
          href="#login"
          class="btn btn-primary px-4 py-2 text-sm"
        >
          Register
        </a>
      </div>

      <!-- Mobile Hamburger -->
      <button
        class="md:hidden flex items-center justify-center w-10 h-10 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-lightest)] hover:text-[var(--color-primary)] transition-colors"
        :aria-expanded="isMobileMenuOpen"
        aria-controls="mobile-menu"
        aria-label="Toggle mobile menu"
        @click="toggleMobileMenu"
      >
        <svg v-if="!isMobileMenuOpen" width="20" height="20" fill="none" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
        </svg>
        <svg v-else width="20" height="20" fill="none" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
        </svg>
      </button>
    </nav>

    <!-- Mobile Drawer -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div
        v-if="isMobileMenuOpen"
        id="mobile-menu"
        class="md:hidden bg-white/95 backdrop-blur-xl border-b border-[var(--color-border)] px-4 pb-4"
        role="dialog"
        aria-label="Mobile navigation"
      >
        <ul class="list-none m-0 p-0 space-y-1 mb-4" role="list">
          <li v-for="item in NAV_ITEMS" :key="item.label">
            <a
              :href="item.href"
              class="block px-4 py-3 rounded-lg text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-lightest)] transition-all no-underline"
              @click="closeMenu"
            >
              {{ item.label }}
            </a>
          </li>
        </ul>
        <div class="flex flex-col gap-2">
          <a href="#login" class="btn btn-ghost w-full text-sm" @click="closeMenu">Login</a>
          <a href="#login" class="btn btn-primary w-full text-sm" @click="closeMenu">Register</a>
        </div>
      </div>
    </Transition>
  </header>
</template>
