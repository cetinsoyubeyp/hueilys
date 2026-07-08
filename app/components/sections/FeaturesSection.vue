<script setup lang="ts">
/**
 * FeaturesSection — Three feature cards with scroll-triggered animations.
 */

import { FEATURES } from '~/constants'
import { useScrollAnimation } from '~/composables/useScrollAnimation'

const sectionRef = ref<HTMLElement | null>(null)
const { animateFadeIn, animateStagger } = useScrollAnimation()

onMounted(() => {
  if (sectionRef.value) {
    animateFadeIn(sectionRef.value.querySelector('[data-section-header]') as Element, { y: 24 })
    animateStagger('[data-feature-card]', { y: 48, stagger: 0.18 })
  }
})
</script>

<template>
  <section
    id="features"
    ref="sectionRef"
    class="section-padding bg-white"
    aria-labelledby="features-heading"
  >
    <div class="container-app">
      <!-- Section header -->
      <div
        data-section-header
        class="text-center max-w-2xl mx-auto mb-14 opacity-0"
      >
        <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--color-primary-lightest)] border border-[var(--color-primary-lighter)] text-xs font-semibold text-[var(--color-primary)] mb-4">
          Temel özellikler
        </div>
        <h2
          id="features-heading"
          class="text-headline text-[var(--color-text-primary)] mb-4"
        >
          Daha hızlı büyümek için
          <span class="gradient-text">&nbsp;ihtiyacınız olan her şey</span>
        </h2>
        <p class="text-[var(--color-text-secondary)] text-lg leading-relaxed">
          Gerçek zamanlı analizlerden yapay zeka destekli önerilere kadar — modern e-ticaret satıcılarının ihtiyaç duyduğu tüm araçlar tek platformda.
        </p>
      </div>

      <!-- Feature cards grid -->
      <div
        class="grid grid-cols-1 md:grid-cols-3 gap-6"
        role="list"
        aria-label="Platform features"
      >
        <div
          v-for="feature in FEATURES"
          :key="feature.id"
          data-feature-card
          class="opacity-0"
          role="listitem"
        >
          <FeatureCard :feature="feature" />
        </div>
      </div>
    </div>
  </section>
</template>
