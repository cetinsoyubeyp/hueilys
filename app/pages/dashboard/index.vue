<script setup lang="ts">
/**
 * dashboard/index.vue — Main dashboard page.
 * Shows EmptyState if user has no stores, otherwise shows store list.
 * Protected by auth middleware.
 */

import type { Store } from '~/types'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
})

useSeoMeta({
  title: 'Pano — Hueilys',
  description: 'E-ticaret mağazalarınızı yönetin',
  robots: 'noindex',
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()

// ─── Stores state ─────────────────────────────────────────────────────────────
const stores = ref<Store[]>([])
const isFetching = ref(true)
const showAddModal = ref(false)

async function fetchStores() {
  if (!user.value) return
  isFetching.value = true

  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .order('created_at', { ascending: false })

  if (!error && data) stores.value = data as Store[]
  isFetching.value = false
}

const showOnboarding = ref(false)

onMounted(async () => {
  await fetchStores()
  const completed = localStorage.getItem('hueilys-onboarding-completed')
  if (!completed) {
    showOnboarding.value = true
  }
})

// Reload after adding a store
async function handleStoreSaved() {
  showAddModal.value = false
  await fetchStores()
}

const marketplaceLabel: Record<string, string> = {
  trendyol:    'Trendyol',
  amazon:      'Amazon',
  hepsiburada: 'Hepsiburada',
  n11:         'n11',
  ebay:        'eBay',
  shopify:     'Shopify',
}

const marketplaceColor: Record<string, string> = {
  trendyol:    '#F27A1A',
  amazon:      '#FF9900',
  hepsiburada: '#FF6000',
  n11:         '#7B2FBE',
  ebay:        '#E53238',
  shopify:     '#95BF47',
}
</script>

<template>
  <div class="p-6 lg:p-8">

    <!-- Loading skeleton -->
    <div v-if="isFetching" class="flex items-center justify-center min-h-[60vh]">
      <div class="flex flex-col items-center gap-3">
        <div class="w-8 h-8 border-2 border-[var(--color-primary-lighter)] border-t-[var(--color-primary)] rounded-full animate-spin" aria-hidden="true" />
        <p class="text-sm text-[var(--color-text-muted)]">Yükleniyor…</p>
      </div>
    </div>

    <!-- Empty state -->
    <EmptyState
      v-else-if="stores.length === 0"
      @add-store="showAddModal = true"
    />

    <!-- Stores list -->
    <template v-else>
      <!-- Page header -->
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-xl font-bold text-[var(--color-text-primary)]">Pano</h1>
          <p class="text-sm text-[var(--color-text-muted)] mt-0.5">{{ stores.length }} mağaza bağlı</p>
        </div>
        <button
          type="button"
          id="btn-add-store"
          class="btn btn-primary px-4 py-2 text-sm gap-2"
          @click="showAddModal = true"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" stroke-width="2" stroke-linecap="round"/>
            <line x1="5" y1="12" x2="19" y2="12" stroke-width="2" stroke-linecap="round"/>
          </svg>
          Mağaza Ekle
        </button>
      </div>

      <!-- Store cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <div
          v-for="store in stores"
          :key="store.id"
          class="bg-white rounded-2xl border border-[var(--color-border)] p-5 hover:shadow-md transition-shadow"
        >
          <div class="flex items-start justify-between mb-4">
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-xl text-white font-black text-sm flex items-center justify-center flex-shrink-0"
                :style="`background: ${marketplaceColor[store.marketplace] ?? '#6B7280'};`"
              >
                {{ store.marketplace[0].toUpperCase() }}
              </div>
              <div>
                <p class="font-semibold text-sm text-[var(--color-text-primary)]">{{ store.store_name }}</p>
                <p class="text-xs text-[var(--color-text-muted)]">{{ marketplaceLabel[store.marketplace] }}</p>
              </div>
            </div>
            <!-- Active badge -->
            <span class="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
              Aktif
            </span>
          </div>

          <div class="text-xs text-[var(--color-text-muted)]">
            Bağlantı: {{ new Date(store.created_at).toLocaleDateString('tr-TR') }}
          </div>
        </div>
      </div>
    </template>

    <!-- Add store modal -->
    <AddStoreModal
      v-if="showAddModal"
      @close="showAddModal = false"
      @saved="handleStoreSaved"
    />

    <!-- Onboarding wizard modal -->
    <OnboardingModal
      v-if="showOnboarding"
      @close="showOnboarding = false"
    />
  </div>
</template>
