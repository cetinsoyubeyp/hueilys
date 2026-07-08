<script setup lang="ts">
/**
 * PlatformPreview — Section showcasing the dashboard mockup with scroll animation.
 */

import { useScrollAnimation } from '~/composables/useScrollAnimation'

const sectionRef = ref<HTMLElement | null>(null)
const mockupRef = ref<HTMLDivElement | null>(null)
const { animateFadeIn } = useScrollAnimation()

onMounted(async () => {
  if (!import.meta.client || !sectionRef.value) return

  const { gsap } = await import('gsap')
  const { ScrollTrigger } = await import('gsap/ScrollTrigger')
  gsap.registerPlugin(ScrollTrigger)

  // Header fade-in
  animateFadeIn(sectionRef.value.querySelector('[data-preview-header]') as Element, { y: 24 })

  // Mockup scale-in
  if (mockupRef.value) {
    gsap.fromTo(
      mockupRef.value,
      { opacity: 0, y: 60, scale: 0.96 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: mockupRef.value,
          start: 'top 80%',
          once: true,
        },
      }
    )
  }
})
</script>

<template>
  <section
    id="platform"
    ref="sectionRef"
    class="section-padding bg-hero-gradient relative overflow-hidden"
    aria-labelledby="platform-heading"
  >
    <!-- Background decorations -->
    <div
      class="absolute inset-0 bg-dot-pattern opacity-40 pointer-events-none"
      aria-hidden="true"
    />
    <div
      class="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none"
      style="background: radial-gradient(ellipse at 50% 0%, rgba(37,99,235,0.08) 0%, transparent 70%);"
      aria-hidden="true"
    />

    <div class="container-app relative z-10">
      <!-- Section header -->
      <div
        data-preview-header
        class="text-center max-w-2xl mx-auto mb-14 opacity-0"
      >
        <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--color-primary-lightest)] border border-[var(--color-primary-lighter)] text-xs font-semibold text-[var(--color-primary)] mb-4">
          Platform önizleme
        </div>
        <h2
          id="platform-heading"
          class="text-headline text-[var(--color-text-primary)] mb-4"
        >
          Komuta merkeziniz,
          <span class="gradient-text-blue">&nbsp;kusursuz tasarımlı</span>
        </h2>
        <p class="text-[var(--color-text-secondary)] text-lg leading-relaxed">
          Dağınıklıktan uzak, temiz bir arayüz — ihtiyacınız olan verileri göz önünde sunar. Kargaşa yok, gürültu yok.
        </p>
      </div>

      <!-- Dashboard mockup -->
      <div ref="mockupRef" class="opacity-0">
        <DashboardMockup />
      </div>

      <!-- Bottom CTA -->
      <div class="text-center mt-10">
        <a
          href="#login"
          class="btn btn-primary px-8 py-3.5 text-base gap-2"
          aria-label="Platforma ücretsiz başlayın"
        >
          Ücretsiz Başla
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/>
          </svg>
        </a>
        <p class="text-sm text-[var(--color-text-muted)] mt-3">Kredi kartı gerekmez · 14 gün ücretsiz deneme</p>
      </div>
    </div>
  </section>
</template>
