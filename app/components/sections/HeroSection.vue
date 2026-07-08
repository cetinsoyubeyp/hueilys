<script setup lang="ts">
/**
 * HeroSection — Hero with content (left) and login card (right).
 * Mouse-tracking light glow effect.
 */

import { useMouseParallax } from '~/composables/useMouseParallax'

const { position: mousePos } = useMouseParallax()

const lightStyle = computed(() => ({
  left: `${mousePos.value.x}px`,
  top: `${mousePos.value.y}px`,
}))
</script>

<template>
  <section
    id="home"
    class="relative min-h-screen flex items-center bg-hero-gradient overflow-hidden"
    aria-labelledby="hero-heading"
    style="padding-top: var(--navbar-height);"
  >
    <!-- Dot grid -->
    <div class="absolute inset-0 bg-dot-pattern opacity-60 pointer-events-none" aria-hidden="true" />

    <!-- Mouse light -->
    <div class="mouse-light" :style="lightStyle" aria-hidden="true" />

    <!-- Decorative blobs -->
    <div
      class="absolute top-1/4 left-1/4 w-72 h-72 rounded-full pointer-events-none"
      style="background: radial-gradient(circle, rgba(37,99,235,0.07) 0%, transparent 70%); filter: blur(40px);"
      aria-hidden="true"
    />
    <div
      class="absolute bottom-1/4 right-1/3 w-64 h-64 rounded-full pointer-events-none"
      style="background: radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%); filter: blur(50px);"
      aria-hidden="true"
    />

    <!-- Content grid -->
    <div class="container-app w-full py-16 lg:py-20 relative z-10">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 xl:gap-16 items-center">

        <!-- Left: text -->
        <HeroContent />

        <!-- Right: login card -->
        <div class="flex justify-center lg:justify-end">
          <div class="w-full max-w-[420px]">
            <LoginCard />
          </div>
        </div>

      </div>
    </div>

    <!-- Bottom fade -->
    <div
      class="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
      style="background: linear-gradient(to bottom, transparent, var(--color-surface)); z-index: 20;"
      aria-hidden="true"
    />
  </section>
</template>
