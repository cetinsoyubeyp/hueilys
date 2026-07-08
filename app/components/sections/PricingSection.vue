<script setup lang="ts">
/**
 * PricingSection — Redesigned pricing section showcasing the pay-as-you-go credit system.
 * Emphasizes the "Yüklediğin Kadar Harca" slogan with gorgeous, interactive elements.
 */
import { useScrollAnimation } from '~/composables/useScrollAnimation'

const sectionRef = ref<HTMLElement | null>(null)
const { animateFadeIn, animateStagger } = useScrollAnimation()

onMounted(() => {
  if (sectionRef.value) {
    animateFadeIn(sectionRef.value.querySelector('[data-pricing-header]') as Element, { y: 24 })
    animateStagger('[data-pricing-card]', { y: 48, stagger: 0.12 })
  }
})

const packages = [
  {
    name: 'Deneme Paketi',
    credits: '50 Kredi',
    price: '₺19',
    unitPrice: '₺0.38 / kredi',
    description: 'Yapay zeka analizlerini ve otomasyonları keşfetmek için ideal başlangıç.',
    badge: 'Yeni Başlayan',
    features: ['50 Kredi Yükleme', 'Tüm Yapay Zeka Özellikleri Açık', 'Sınırsız Entegrasyon', 'E-posta Desteği'],
    popular: false,
  },
  {
    name: 'Büyüme Paketi',
    credits: '150 Kredi',
    price: '₺49',
    unitPrice: '₺0.32 / kredi',
    description: 'Düzenli optimizasyon yapan aktif satıcılar için en çok tercih edilen paket.',
    badge: 'En Popüler',
    features: ['150 Kredi Yükleme', 'Öncelikli Yapay Zeka İşlemleri', 'Detaylı İade ve Kâr Analizi', '7/24 Öncelikli Destek'],
    popular: true,
  },
  {
    name: 'Profesyonel Paket',
    credits: '500 Kredi',
    price: '₺149',
    unitPrice: '₺0.29 / kredi',
    description: 'Yüksek satış hacmine sahip profesyonel e-ticaret markaları için.',
    badge: 'En İyi Değer',
    features: ['500 Kredi Yükleme', 'Anında Güncelleme Önceliği', 'Sınırsız Analiz & Raporlama', 'Birebir Danışmanlık Desteği'],
    popular: false,
  },
]

</script>

<template>
  <section
    id="pricing"
    ref="sectionRef"
    class="section-padding bg-surface relative overflow-hidden"
    aria-labelledby="pricing-heading"
  >
    <!-- Grid backgrounds and ambient light -->
    <div class="absolute inset-0 bg-dot-pattern opacity-40 pointer-events-none" aria-hidden="true" />
    <div
      class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none rounded-full"
      style="background: radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 70%); filter: blur(60px);"
      aria-hidden="true"
    />

    <div class="container-app relative z-10">
      <!-- Section Header -->
      <div
        data-pricing-header
        class="text-center max-w-3xl mx-auto mb-16 opacity-0"
      >
        <h2
          id="pricing-heading"
          class="text-headline text-[var(--color-text-primary)] mb-4"
        >
          Abonelik Yok.
          <span class="gradient-text">Yüklediğin Kadar Harca!</span>
        </h2>
        <p class="text-[var(--color-text-secondary)] text-lg leading-relaxed max-w-2xl mx-auto">
          Sabit aylık ücretler ödemeye son verin. Hueilys'te sadece kullandığınız kadar bakiye harcarsınız. İhtiyacınız olan krediyi yükleyin, dilediğiniz gibi kullanın.
        </p>
      </div>

      <!-- Packages Grid -->
      <div
        class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20"
        role="list"
        aria-label="Kredi Paketleri"
      >
        <div
          v-for="pkg in packages"
          :key="pkg.credits"
          data-pricing-card
          class="opacity-0"
          role="listitem"
        >
          <div
            :class="[
              'pricing-card h-full flex flex-col relative rounded-2xl p-8 transition-all duration-300',
              pkg.popular
                ? 'bg-white border-2 border-[var(--color-primary)] shadow-xl relative -translate-y-2'
                : 'bg-white/80 backdrop-blur-md border border-[var(--color-border)] hover:border-[var(--color-primary-light)] hover:shadow-lg'
            ]"
          >
            <!-- Badge -->
            <span
              v-if="pkg.badge"
              :class="[
                'absolute top-0 right-8 -translate-y-1/2 text-[10px] uppercase tracking-wider font-extrabold px-3 py-1 rounded-full text-white',
                pkg.popular
                  ? 'bg-gradient-to-r from-[var(--color-primary)] to-purple-600'
                  : 'bg-gray-800'
              ]"
            >
              {{ pkg.badge }}
            </span>

            <div class="mb-6">
              <h3 class="text-sm font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">
                {{ pkg.name }}
              </h3>
              <div class="flex items-baseline gap-2">
                <span class="text-4xl font-extrabold text-[var(--color-text-primary)] tracking-tight">
                  {{ pkg.price }}
                </span>
                <span class="text-sm text-[var(--color-text-muted)] font-medium">
                  / {{ pkg.credits }}
                </span>
              </div>
              <p class="text-xs text-[var(--color-primary)] font-semibold mt-1">
                {{ pkg.unitPrice }}
              </p>
            </div>

            <p class="text-sm text-[var(--color-text-secondary)] mb-6 flex-grow">
              {{ pkg.description }}
            </p>

            <hr class="border-[var(--color-border)] my-6">

            <!-- Features -->
            <ul class="space-y-3 mb-8 list-none p-0">
              <li
                v-for="feat in pkg.features"
                :key="feat"
                class="flex items-start gap-2.5 text-sm text-[var(--color-text-secondary)]"
              >
                <svg
                  class="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="3"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>{{ feat }}</span>
              </li>
            </ul>

            <!-- CTA -->
            <a
              href="#home"
              :class="[
                'btn w-full py-3 text-center justify-center font-bold transition-all duration-200',
                pkg.popular
                  ? 'btn-primary'
                  : 'btn-ghost'
              ]"
            >
              Kredi Yükle
            </a>
          </div>
        </div>
      </div>

    </div>
  </section>
</template>

<style scoped>
.pricing-card {
  box-shadow: 0 4px 30px rgba(37, 99, 235, 0.03);
}

.pricing-card:hover {
  transform: translateY(-4px);
}
</style>
