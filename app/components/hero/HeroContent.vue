<script setup lang="ts">
/**
 * HeroContent — Left side of the hero: headline, description, CTA buttons.
 * GSAP staggered entrance animation on mount.
 */

const contentRef = ref<HTMLDivElement | null>(null)

onMounted(async () => {
  if (!import.meta.client || !contentRef.value) return

  const { gsap } = await import('gsap')
  const children = contentRef.value.querySelectorAll('[data-animate]')

  gsap.fromTo(
    children,
    { opacity: 0, y: 30 },
    {
      opacity: 1,
      y: 0,
      duration: 0.7,
      stagger: 0.12,
      ease: 'power2.out',
      delay: 0.2,
    }
  )
})
</script>

<template>
  <div ref="contentRef" class="flex flex-col items-start gap-6 max-w-xl">
    <!-- Badge -->
    <div
      data-animate
      class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--color-primary-lightest)] border border-[var(--color-primary-lighter)] text-xs font-semibold text-[var(--color-primary)] opacity-0"
    >
      <span class="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] animate-pulse" aria-hidden="true" />
      Genel beta'da — 14 gün ücretsiz
    </div>

    <!-- Main Headline -->
    <h1
      data-animate
      class="text-display text-[var(--color-text-primary)] opacity-0"
    >
      Tüm
      <span class="gradient-text-blue">&nbsp;e-ticaretinizi&nbsp;</span>
      tek yerden yönetin.
    </h1>

    <!-- Description -->
    <p
      data-animate
      class="text-lg text-[var(--color-text-secondary)] leading-relaxed opacity-0"
    >
      Geliri takip edin, siparişleri yönetin, stoku optimize edin ve yapay zeka destekli analizler çalıştırın — hepsi tek, güzel bir panelden. Modern e-ticaret satıcıları için tasarlandı.
    </p>

    <!-- CTA Buttons -->
    <div data-animate class="flex flex-wrap items-center gap-3 opacity-0">
      <a
        href="#login"
        class="btn btn-primary px-6 py-3 text-base gap-2"
        aria-label="Ücretsiz başla — kredi kartı gerekmez"
      >
        Ücretsiz Başla
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/>
        </svg>
      </a>
      <button
        type="button"
        class="btn btn-ghost px-6 py-3 text-base gap-2"
        aria-label="Ürün demo videosunu izle"
      >
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke-width="1.75"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M10 8l6 4-6 4V8z" fill="currentColor"/>
        </svg>
        Demo İzle
      </button>
    </div>

    <!-- Social Proof -->
    <div
      data-animate
      class="flex items-center gap-3 opacity-0"
    >
      <!-- Avatars -->
      <div class="flex -space-x-2" aria-hidden="true">
        <div v-for="i in 4" :key="i" :class="`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br`" :style="`background: hsl(${210 + i * 30}, 70%, 55%)`">{{ String.fromCharCode(64 + i) }}</div>
      </div>
      <p class="text-sm text-[var(--color-text-muted)]">
        <span class="font-semibold text-[var(--color-text-secondary)]">2.400+</span>
        satıcı aramıza katıldı
      </p>
    </div>
  </div>
</template>
