<script setup lang="ts">
/**
 * AddStoreModal — Multi-step modal for adding a marketplace store.
 * Step 1: Marketplace selection
 * Step 2: API credentials form
 * Step 3: Success confirmation
 */

import type { Marketplace, MarketplaceId, AddStoreStep } from '~/types'

const emit = defineEmits<{ close: []; saved: [] }>()

const supabase = useSupabaseClient()
const user = useSupabaseUser()

// ─── Step state ───────────────────────────────────────────────────────────────
const step = ref<AddStoreStep>('marketplace')
const selectedMarketplace = ref<Marketplace | null>(null)

// ─── Marketplaces ─────────────────────────────────────────────────────────────
const marketplaces: Marketplace[] = [
  {
    id: 'trendyol',
    name: 'Trendyol',
    color: '#F27A1A',
    bgColor: '#FFF7ED',
    active: true,
    fields: [
      {
        key: 'store_name',
        label: 'Mağaza Adı',
        placeholder: 'Örn: Ana Mağazam',
        hint: 'Panelde görüntülenecek isim',
        type: 'text',
      },
      {
        key: 'seller_id',
        label: 'Satıcı ID',
        placeholder: '123456',
        hint: 'Trendyol Partner Panel → Hesap Bilgileri',
        type: 'text',
      },
      {
        key: 'api_key',
        label: 'API Key',
        placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
        hint: 'Trendyol Partner Panel → Entegrasyonlar → API Bilgileri',
        type: 'text',
      },
      {
        key: 'api_secret',
        label: 'API Secret',
        placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
        hint: 'API Key ile birlikte verilir',
        type: 'password',
      },
    ],
  },
  { id: 'amazon',      name: 'Amazon',      color: '#FF9900', bgColor: '#FFFBEB', active: false, fields: [] },
  { id: 'hepsiburada', name: 'Hepsiburada', color: '#FF6000', bgColor: '#FFF7ED', active: false, fields: [] },
  { id: 'n11',         name: 'n11',         color: '#7B2FBE', bgColor: '#FAF5FF', active: false, fields: [] },
  { id: 'ebay',        name: 'eBay',        color: '#E53238', bgColor: '#FFF1F2', active: false, fields: [] },
  { id: 'shopify',     name: 'Shopify',     color: '#95BF47', bgColor: '#F7FEE7', active: false, fields: [] },
]

// ─── Credentials form ─────────────────────────────────────────────────────────
const formData = reactive<Record<string, string>>({})
const showSecrets = reactive<Record<string, boolean>>({})
const isLoading = ref(false)
const error = ref<string | null>(null)

function selectMarketplace(mp: Marketplace) {
  if (!mp.active) return
  selectedMarketplace.value = mp
  // Reset form
  Object.keys(formData).forEach(k => delete formData[k])
  mp.fields.forEach(f => { formData[f.key] = '' })
  error.value = null
  step.value = 'credentials'
}

function goBack() {
  step.value = 'marketplace'
  selectedMarketplace.value = null
  error.value = null
}

// ─── Save ─────────────────────────────────────────────────────────────────────
async function saveStore() {
  if (!selectedMarketplace.value || !user.value) return

  // Validate required fields
  const mp = selectedMarketplace.value
  for (const field of mp.fields) {
    if (!formData[field.key]?.trim()) {
      error.value = `"${field.label}" alanı zorunludur.`
      return
    }
  }

  isLoading.value = true
  error.value = null

  // Session'ı doğrula — client token'ın gönderildiğini garanti et
  const { data: { session } } = await supabase.auth.getSession()
  console.log('[AddStoreModal] session user:', session?.user?.id)

  if (!session) {
    error.value = 'Oturum süresi dolmuş. Lütfen sayfayı yenileyip tekrar giriş yapın.'
    isLoading.value = false
    return
  }

  const { data, error: dbError } = await supabase
    .rpc('upsert_store', {
      p_store_id:    null,
      p_store_name:  formData.store_name ?? '',
      p_seller_id:   formData.seller_id  ?? null,
      p_api_key:     formData.api_key    ?? null,
      p_api_secret:  formData.api_secret ?? null,
      p_marketplace: mp.id
    })

  console.log('[AddStoreModal] result status:', dbError ? 'FAILED' : 'SUCCESS')

  isLoading.value = false

  if (dbError) {
    error.value = `Hata: ${dbError.message} (kod: ${dbError.code})`
    return
  }

  step.value = 'success'
}

function finish() {
  emit('saved')
  emit('close')
}

// Close on ESC
onMounted(() => {
  const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') emit('close') }
  window.addEventListener('keydown', handler)
  onUnmounted(() => window.removeEventListener('keydown', handler))
})
</script>

<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      style="background: rgba(15, 23, 42, 0.55); backdrop-filter: blur(4px);"
      role="dialog"
      aria-modal="true"
      :aria-label="step === 'marketplace' ? 'Pazaryeri seç' : 'API bilgilerini gir'"
      @click.self="$emit('close')"
    >
      <!-- Modal box -->
      <Transition
        enter-active-class="transition-all duration-250 ease-out"
        enter-from-class="opacity-0 scale-95 translate-y-2"
        enter-to-class="opacity-100 scale-100 translate-y-0"
      >
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

          <!-- ─── STEP 1: Marketplace selection ─────────────────────────────── -->
          <template v-if="step === 'marketplace'">
            <!-- Header -->
            <div class="flex items-start justify-between px-6 pt-6 pb-4">
              <div>
                <h2 class="text-base font-bold text-[var(--color-text-primary)]">Pazaryeri Seç</h2>
                <p class="text-sm text-[var(--color-text-muted)] mt-0.5">Bağlamak istediğiniz pazaryerini seçin</p>
              </div>
              <button
                type="button"
                class="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-[var(--color-text-muted)] transition-colors flex-shrink-0 mt-0.5"
                aria-label="Kapat"
                @click="$emit('close')"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <!-- Marketplace grid -->
            <div class="grid grid-cols-3 gap-2.5 px-6 pb-6">
              <button
                v-for="mp in marketplaces"
                :key="mp.id"
                type="button"
                :disabled="!mp.active"
                :class="[
                  'relative flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 text-sm font-semibold transition-all duration-150',
                  mp.active
                    ? 'border-transparent hover:border-current hover:shadow-md cursor-pointer'
                    : 'border-transparent opacity-50 cursor-not-allowed bg-gray-50',
                ]"
                :style="mp.active ? `background: ${mp.bgColor}; color: ${mp.color};` : ''"
                :aria-label="mp.active ? `${mp.name} seç` : `${mp.name} yakında`"
                @click="selectMarketplace(mp)"
              >
                <!-- Marketplace initial / logo placeholder -->
                <div
                  class="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black text-white shadow-sm"
                  :style="`background: ${mp.color};`"
                >
                  {{ mp.name[0] }}
                </div>
                <span>{{ mp.name }}</span>

                <!-- Coming soon badge -->
                <div
                  v-if="!mp.active"
                  class="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-gray-200 text-gray-500"
                >
                  Yakında
                </div>
              </button>
            </div>
          </template>

          <!-- ─── STEP 2: API credentials ────────────────────────────────────── -->
          <template v-else-if="step === 'credentials' && selectedMarketplace">
            <!-- Header -->
            <div class="flex items-start justify-between px-6 pt-6 pb-4">
              <div class="flex items-center gap-3">
                <!-- Back button -->
                <button
                  type="button"
                  class="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-[var(--color-text-muted)] transition-colors flex-shrink-0"
                  aria-label="Geri"
                  @click="goBack"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
                  </svg>
                </button>
                <div>
                  <div class="flex items-center gap-2">
                    <div
                      class="w-5 h-5 rounded-md text-white text-[10px] font-black flex items-center justify-center"
                      :style="`background: ${selectedMarketplace.color};`"
                    >
                      {{ selectedMarketplace.name[0] }}
                    </div>
                    <h2 class="text-base font-bold text-[var(--color-text-primary)]">
                      {{ selectedMarketplace.name }} Bağlantısı
                    </h2>
                  </div>
                  <p class="text-sm text-[var(--color-text-muted)] mt-0.5 ml-7">API bilgilerini girin</p>
                </div>
              </div>
              <button
                type="button"
                class="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-[var(--color-text-muted)] transition-colors"
                aria-label="Kapat"
                @click="$emit('close')"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <!-- Helper banner -->
            <div class="mx-6 mb-4 flex items-start gap-2.5 p-3 rounded-xl bg-blue-50 border border-blue-100">
              <svg class="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="12" cy="12" r="10" stroke-width="1.75"/>
                <path stroke-linecap="round" stroke-width="1.75" d="M12 16v-4M12 8h.01"/>
              </svg>
              <p class="text-xs text-blue-700 leading-relaxed">
                API bilgilerinizi
                <strong>Trendyol Partner Panel → Entegrasyonlar → API Bilgileri</strong>
                bölümünden alabilirsiniz.
              </p>
            </div>

            <!-- Error -->
            <div v-if="error" class="mx-6 mb-4 flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100" role="alert">
              <svg class="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="12" cy="12" r="10" stroke-width="1.75"/>
                <path stroke-linecap="round" stroke-width="1.75" d="M12 8v4M12 16h.01"/>
              </svg>
              <p class="text-xs text-red-600">{{ error }}</p>
            </div>

            <!-- Form -->
            <form class="px-6 pb-6 space-y-4" @submit.prevent="saveStore">
              <div
                v-for="field in selectedMarketplace.fields"
                :key="field.key"
              >
                <label :for="`field-${field.key}`" class="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
                  {{ field.label }}
                </label>
                <div class="relative">
                  <input
                    :id="`field-${field.key}`"
                    v-model="formData[field.key]"
                    :type="field.type === 'password' && !showSecrets[field.key] ? 'password' : 'text'"
                    class="form-input"
                    :placeholder="field.placeholder"
                    required
                    aria-required="true"
                    :class="field.type === 'password' ? 'pr-11' : ''"
                  />
                  <!-- Show/hide password -->
                  <button
                    v-if="field.type === 'password'"
                    type="button"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
                    :aria-label="showSecrets[field.key] ? 'Gizle' : 'Göster'"
                    @click="showSecrets[field.key] = !showSecrets[field.key]"
                  >
                    <svg v-if="!showSecrets[field.key]" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                    <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"/>
                    </svg>
                  </button>
                </div>
                <p v-if="field.hint" class="text-xs text-[var(--color-text-muted)] mt-1">{{ field.hint }}</p>
              </div>

              <!-- Buttons -->
              <div class="flex gap-3 pt-2">
                <button
                  type="button"
                  class="btn btn-ghost flex-1 py-2.5 text-sm"
                  @click="goBack"
                >
                  Geri
                </button>
                <button
                  type="submit"
                  class="btn btn-primary flex-1 py-2.5 text-sm gap-2"
                  :disabled="isLoading"
                  :aria-busy="isLoading"
                >
                  <span v-if="isLoading" class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                  {{ isLoading ? 'Bağlanıyor…' : 'Mağazayı Bağla' }}
                </button>
              </div>
            </form>
          </template>

          <!-- ─── STEP 3: Success ────────────────────────────────────────────── -->
          <template v-else-if="step === 'success'">
            <div class="px-8 py-10 text-center" role="status" aria-live="polite">
              <!-- Success icon -->
              <div class="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-5">
                <svg class="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
              </div>

              <h3 class="text-lg font-bold text-[var(--color-text-primary)] mb-2">
                Mağaza başarıyla bağlandı!
              </h3>
              <p class="text-sm text-[var(--color-text-secondary)] mb-6">
                <strong>{{ formData.store_name }}</strong> adlı
                {{ selectedMarketplace?.name }} mağazanız panele eklendi.
              </p>

              <button
                type="button"
                class="btn btn-primary px-6 py-2.5 text-sm"
                @click="finish"
              >
                Panele Git
              </button>
            </div>
          </template>

        </div>
      </Transition>
    </div>
  </Teleport>
</template>
