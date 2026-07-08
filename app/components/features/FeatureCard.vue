<script setup lang="ts">
/**
 * FeatureCard — Single feature card with icon, title, description, and hover effects.
 */

import type { Feature } from '~/types'

const props = defineProps<{
  feature: Feature
}>()
</script>

<template>
  <article
    class="surface-card p-7 flex flex-col gap-4 group cursor-default"
    :aria-label="`Feature: ${feature.title}`"
  >
    <!-- Icon container -->
    <div
      class="w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
      :style="`background: ${feature.accentColor}15; border: 1px solid ${feature.accentColor}22;`"
    >
      <!-- Analytics icon -->
      <svg
        v-if="feature.icon === 'analytics'"
        width="24"
        height="24"
        fill="none"
        viewBox="0 0 24 24"
        :style="`color: ${feature.accentColor}`"
        aria-hidden="true"
      >
        <path d="M3 3v18h18" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
        <path d="M7 16l4-5 4 3 4-6" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="19" cy="8" r="1.5" fill="currentColor"/>
      </svg>

      <!-- Automation icon -->
      <svg
        v-else-if="feature.icon === 'automation'"
        width="24"
        height="24"
        fill="none"
        viewBox="0 0 24 24"
        :style="`color: ${feature.accentColor}`"
        aria-hidden="true"
      >
        <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M2 17l10 5 10-5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M2 12l10 5 10-5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>

      <!-- AI Insights icon -->
      <svg
        v-else-if="feature.icon === 'ai'"
        width="24"
        height="24"
        fill="none"
        viewBox="0 0 24 24"
        :style="`color: ${feature.accentColor}`"
        aria-hidden="true"
      >
        <path d="M12 2a7 7 0 017 7 7 7 0 01-7 7 7 7 0 01-7-7 7 7 0 017-7z" stroke="currentColor" stroke-width="1.75"/>
        <path d="M12 22v-6M8 22h8" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
        <path d="M9 9l1.5 1.5L12 9l1.5 1.5L15 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M10 12h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </div>

    <!-- Text -->
    <div class="flex flex-col gap-2">
      <h3
        class="text-title text-[var(--color-text-primary)] transition-colors duration-200"
        :style="`color: ${feature.accentColor === '#2563EB' ? 'var(--color-text-primary)' : 'var(--color-text-primary)'}`"
      >
        {{ feature.title }}
      </h3>
      <p class="text-sm text-[var(--color-text-secondary)] leading-relaxed">
        {{ feature.description }}
      </p>
    </div>

    <!-- Hover CTA -->
    <div
      class="flex items-center gap-1.5 text-sm font-semibold transition-all duration-200 mt-auto pt-2 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0"
      :style="`color: ${feature.accentColor}`"
      aria-hidden="true"
    >
      Learn more
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17 8l4 4m0 0l-4 4m4-4H3"/>
      </svg>
    </div>
  </article>
</template>
