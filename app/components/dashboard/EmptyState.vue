<script setup lang="ts">
/**
 * EmptyState — Shown on the dashboard when the user has no connected stores.
 * Provides a prominent "Mağaza Ekle" CTA.
 */

defineEmits<{ addStore: [] }>()
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] px-6 py-16 text-center">

    <!-- Illustration -->
    <div class="relative mb-8">
      <!-- Glow -->
      <div class="absolute inset-0 rounded-full blur-3xl opacity-20" style="background: radial-gradient(circle, #2563EB 0%, transparent 70%); transform: scale(1.5);" aria-hidden="true" />

      <!-- Icon wrapper -->
      <div class="relative w-24 h-24 rounded-3xl bg-white border border-[var(--color-border)] flex items-center justify-center shadow-lg mx-auto">
        <svg class="w-12 h-12 text-[var(--color-primary-lighter)]" fill="none" viewBox="0 0 48 48" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <!-- Store building -->
          <rect x="6" y="20" width="36" height="22" rx="2" stroke="currentColor" class="text-[var(--color-primary-light)]"/>
          <path d="M6 20l4-12h28l4 12" class="text-[var(--color-primary-light)]"/>
          <!-- Door -->
          <rect x="19" y="30" width="10" height="12" rx="1" class="text-[var(--color-primary)]" stroke="currentColor"/>
          <!-- Windows -->
          <rect x="9" y="26" width="8" height="6" rx="1" class="text-[var(--color-primary-lighter)]" stroke="currentColor"/>
          <rect x="31" y="26" width="8" height="6" rx="1" class="text-[var(--color-primary-lighter)]" stroke="currentColor"/>
          <!-- Plus sign (add) -->
          <circle cx="38" cy="10" r="8" fill="#EFF6FF" stroke="#2563EB" stroke-width="1.5"/>
          <line x1="38" y1="7" x2="38" y2="13" stroke="#2563EB" stroke-width="1.75" stroke-linecap="round"/>
          <line x1="35" y1="10" x2="41" y2="10" stroke="#2563EB" stroke-width="1.75" stroke-linecap="round"/>
        </svg>
      </div>
    </div>

    <!-- Text -->
    <h2 class="text-xl font-bold text-[var(--color-text-primary)] mb-2">
      Henüz mağaza eklenmedi
    </h2>
    <p class="text-sm text-[var(--color-text-secondary)] max-w-xs leading-relaxed mb-8">
      Satışlarınızı takip etmeye başlamak için ilk pazaryeri mağazanızı bağlayın.
    </p>

    <!-- CTA -->
    <button
      type="button"
      id="btn-add-store-empty"
      class="btn btn-primary px-6 py-3 text-sm gap-2"
      @click="$emit('addStore')"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <line x1="12" y1="5" x2="12" y2="19" stroke-width="2" stroke-linecap="round"/>
        <line x1="5" y1="12" x2="19" y2="12" stroke-width="2" stroke-linecap="round"/>
      </svg>
      Mağaza Ekle
    </button>

    <!-- Helper -->
    <p class="text-xs text-[var(--color-text-muted)] mt-4">
      Trendyol, Amazon, Hepsiburada ve daha fazlasını destekler
    </p>
  </div>
</template>
