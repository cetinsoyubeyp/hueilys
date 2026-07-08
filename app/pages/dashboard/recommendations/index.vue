<script setup lang="ts">
/**
 * recommendations/index.vue — AI Assistant Chatbot page.
 * Leverages the server-side Gemini endpoint to provide store-level insights
 * for Returns, General growth, and Pricing optimizations.
 */

import { useProducts } from '~/composables/useProducts'
import type { Store } from '~/types'

definePageMeta({
  layout:     'dashboard',
  middleware: 'auth',
})

useSeoMeta({
  title:  'YZ Asistanı — Hueilys',
  robots: 'noindex',
})

// ─── Supabase & Store Context ──────────────────────────────────────────────────
const client = useSupabaseClient()
const user = useSupabaseUser()

const { data: storesData } = await useAsyncData('recommendations-stores', async () => {
  const { data } = await client.from('stores').select('id, store_name, marketplace')
  return data || []
})

const stores = computed(() => storesData.value || [])
const activeStoreId = ref<string>('')

// Initialize active store
onMounted(() => {
  if (stores.value.length > 0) {
    activeStoreId.value = stores.value[0].id
  }
})

// ─── Active Analysis Mode ─────────────────────────────────────────────────────
type AnalysisMode = 'returns' | 'general' | 'pricing' | null
const activeMode = ref<AnalysisMode>(null)

// Global date range filter (shared across the whole dashboard)
const { startTs, endTs, shortLabel, rangeLabel, selectedRange } = useDateRange()

// Credit system
const { balance, canAfford, spend, CREDIT_COSTS, fetchCredits } = useCredits()

const MODE_COSTS: Record<string, number> = {
  returns: CREDIT_COSTS.ai_returns,
  general: CREDIT_COSTS.ai_general,
  pricing: CREDIT_COSTS.ai_pricing,
}

// ─── Chat Messages ────────────────────────────────────────────────────────────
interface ChatMessage {
  id: number
  sender: 'user' | 'ai' | 'system'
  text: string
  isThinking?: boolean
}

const chatMessages = ref<ChatMessage[]>([
  {
    id: 1,
    sender: 'ai',
    text: 'Merhaba! Ben Hueilys YZ Asistanı. Mağazanızın canlı verilerini analiz ederek size özel çözümler sunabilirim. \n\nBaşlamak için lütfen sağ taraftaki panelden analiz ettirmek istediğiniz alanı seçin.'
  }
])

const chatInput = ref('')
const isAiResponding = ref(false)
const chatContainer = ref<HTMLElement | null>(null)

function scrollToBottom() {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

// Reset chat when active store changes
watch(activeStoreId, () => {
  activeMode.value = null
  chatMessages.value = [
    {
      id: Date.now(),
      sender: 'ai',
      text: 'Mağaza değiştirildi. Yeni mağazanızın verileri hazır.\n\nBaşlamak için lütfen sağ taraftaki panelden bir analiz alanı seçin.'
    }
  ]
})

// ─── Trigger AI Analysis Mode ─────────────────────────────────────────────────
async function triggerAnalysis(mode: 'returns' | 'general' | 'pricing') {
  if (isAiResponding.value) return
  if (!activeStoreId.value) return

  activeMode.value = mode
  
  // Clear previous chats except the initial welcome, and add a system trigger note
  chatMessages.value = [
    {
      id: Date.now(),
      sender: 'system',
      text: `📊 ${
        mode === 'returns' ? 'İadeler İçin Öneriler' : mode === 'general' ? 'Genel Gelişim Önerileri' : 'Fiyatlandırma Önerileri'
      } analizi başlatıldı. Veri penceresi: ${shortLabel.value} — Çekiliyor...`
    }
  ]
  scrollToBottom()

  isAiResponding.value = true
  
  // ── Credit check ──────────────────────────────────────────────────────────
  const cost = MODE_COSTS[mode] ?? 10
  if (!canAfford(mode === 'returns' ? 'ai_returns' : mode === 'general' ? 'ai_general' : 'ai_pricing')) {
    chatMessages.value.push({
      id: Date.now(),
      sender: 'ai',
      text: `❌ **Yetersiz Kredi**\n\nBu analiz için **${cost} kredi** gerekmektedir. Mevcut bakiyeniz: **${balance.value} kredi**\n\nSağ üstteki kredi göstergesine tıklayarak kredi yükleyebilirsiniz.`
    })
    isAiResponding.value = false
    scrollToBottom()
    return
  }

  // Add temporary thinking loader
  const thinkingId = Date.now() + 1
  chatMessages.value.push({
    id: thinkingId,
    sender: 'ai',
    text: 'Yapay zeka verilerinizi analiz ediyor...',
    isThinking: true
  })
  scrollToBottom()

  try {
    const res = await $fetch<{ response: string }>('/api/gemini/analyze', {
      method: 'POST',
      body: {
        storeId: activeStoreId.value,
        mode,
        startDate: startTs.value,
        endDate:   endTs.value,
      }
    })

    // Remove thinking state
    const thinkingIndex = chatMessages.value.findIndex(m => m.id === thinkingId)
    if (thinkingIndex !== -1) {
      chatMessages.value.splice(thinkingIndex, 1)
    }

    // Deduct credits on success
    await fetchCredits()

    // Add real AI response
    chatMessages.value.push({
      id: Date.now(),
      sender: 'ai',
      text: res.response
    })
  } 
  catch (e: any) {
    const thinkingIndex = chatMessages.value.findIndex(m => m.id === thinkingId)
    if (thinkingIndex !== -1) {
      chatMessages.value.splice(thinkingIndex, 1)
    }
    chatMessages.value.push({
      id: Date.now(),
      sender: 'ai',
      text: `❌ Analiz yapılırken bir hata oluştu: ${e.statusMessage || e.message || 'Bilinmeyen Hata'}`
    })
  } 
  finally {
    isAiResponding.value = false
    scrollToBottom()
  }
}

// ─── Handle Sending custom follow-up query ────────────────────────────────────
async function handleSendMessage() {
  const query = chatInput.value.trim()
  if (!query || isAiResponding.value || !activeMode.value || !activeStoreId.value) return

  chatInput.value = ''
  
  // 1. Add user query
  chatMessages.value.push({
    id: Date.now(),
    sender: 'user',
    text: query
  })
  scrollToBottom()

  // 2. Add thinking state
  isAiResponding.value = true
  const thinkingId = Date.now() + 1
  chatMessages.value.push({
    id: thinkingId,
    sender: 'ai',
    text: 'Sorgunuz inceleniyor...',
    isThinking: true
  })
  scrollToBottom()

  try {
    // 3. Request Gemini follow-up
    const res = await $fetch<{ response: string }>('/api/gemini/analyze', {
      method: 'POST',
      body: {
        storeId:     activeStoreId.value,
        mode:        activeMode.value,
        customQuery: query,
        startDate:   startTs.value,
        endDate:     endTs.value,
      }
    })

    // Remove thinking state
    const thinkingIndex = chatMessages.value.findIndex(m => m.id === thinkingId)
    if (thinkingIndex !== -1) {
      chatMessages.value.splice(thinkingIndex, 1)
    }

    // Add AI answer
    chatMessages.value.push({
      id: Date.now(),
      sender: 'ai',
      text: res.response
    })
  } 
  catch (e: any) {
    const thinkingIndex = chatMessages.value.findIndex(m => m.id === thinkingId)
    if (thinkingIndex !== -1) {
      chatMessages.value.splice(thinkingIndex, 1)
    }
    chatMessages.value.push({
      id: Date.now(),
      sender: 'ai',
      text: `❌ Hata: ${e.statusMessage || e.message || 'Bağlantı kesildi.'}`
    })
  } 
  finally {
    isAiResponding.value = false
    scrollToBottom()
  }
}
// ─── Markdown Parser ─────────────────────────────────────────────────────────
/**
 * Converts a markdown string to safe HTML.
 * Handles: headings (##/###/####), numbered lists, bullet lists,
 * nested bullets, bold (**text**), inline code, hr, and paragraphs.
 */
function parseMarkdown(text: string): string {
  if (!text) return ''

  const lines = text.split('\n')
  const html: string[] = []
  let inUl = false
  let inOl = false

  function closeList() {
    if (inUl) { html.push('</ul>'); inUl = false }
    if (inOl) { html.push('</ol>'); inOl = false }
  }

  function formatInline(s: string): string {
    return s
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.+?)`/g, '<code class="inline-code">$1</code>')
      .replace(/_(.+?)_/g, '<em>$1</em>')
  }

  for (const rawLine of lines) {
    const line = rawLine

    // Heading 4
    if (/^####\s+/.test(line)) {
      closeList()
      html.push(`<h4 class="md-h4">${formatInline(line.replace(/^####\s+/, ''))}</h4>`)
    }
    // Heading 3
    else if (/^###\s+/.test(line)) {
      closeList()
      html.push(`<h3 class="md-h3">${formatInline(line.replace(/^###\s+/, ''))}</h3>`)
    }
    // Heading 2
    else if (/^##\s+/.test(line)) {
      closeList()
      html.push(`<h2 class="md-h2">${formatInline(line.replace(/^##\s+/, ''))}</h2>`)
    }
    // Heading 1
    else if (/^#\s+/.test(line)) {
      closeList()
      html.push(`<h2 class="md-h2">${formatInline(line.replace(/^#\s+/, ''))}</h2>`)
    }
    // Horizontal rule
    else if (/^---+$/.test(line.trim())) {
      closeList()
      html.push('<hr class="md-hr" />')
    }
    // Ordered list item
    else if (/^\d+\.\s+/.test(line)) {
      if (inUl) { html.push('</ul>'); inUl = false }
      if (!inOl) { html.push('<ol class="md-ol">'); inOl = true }
      html.push(`<li>${formatInline(line.replace(/^\d+\.\s+/, ''))}</li>`)
    }
    // Nested bullet (indented with spaces or tab)
    else if (/^(\s{2,}|\t)[\*\-]\s+/.test(line)) {
      if (!inUl && !inOl) { html.push('<ul class="md-ul">'); inUl = true }
      html.push(`<li class="md-li-nested">${formatInline(line.replace(/^(\s+)[\*\-]\s+/, ''))}</li>`)
    }
    // Bullet list item
    else if (/^[\*\-]\s+/.test(line)) {
      if (inOl) { html.push('</ol>'); inOl = false }
      if (!inUl) { html.push('<ul class="md-ul">'); inUl = true }
      html.push(`<li>${formatInline(line.replace(/^[\*\-]\s+/, ''))}</li>`)
    }
    // Empty line — close lists and add spacing
    else if (line.trim() === '') {
      closeList()
      html.push('<div class="md-spacer"></div>')
    }
    // Normal paragraph
    else {
      closeList()
      html.push(`<p class="md-p">${formatInline(line)}</p>`)
    }
  }

  closeList()
  return html.join('\n')
}
</script>

<template>
  <div class="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto flex flex-col h-[calc(100vh-6rem)]">

    <!-- ─── Page Header ───────────────────────────────────────────────────────── -->
    <div class="flex flex-col gap-3 flex-shrink-0">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-2.5">
            <span class="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
              </svg>
            </span>
            YZ Asistanı
          </h1>
          <p class="text-sm text-[var(--color-text-muted)] mt-1">
            Kullanıcı verilerinizi analiz eden, iade, gelişim ve fiyatlandırma odaklı akıllı danışman
          </p>
        </div>

        <!-- Store selector -->
        <div v-if="stores.length > 0" class="flex items-center gap-2">
          <label for="store-select" class="text-xs font-semibold text-[var(--color-text-secondary)] whitespace-nowrap">Aktif Mağaza:</label>
          <select
            id="store-select"
            v-model="activeStoreId"
            class="form-input py-1.5 px-3 pr-8 rounded-xl text-xs font-semibold text-[var(--color-text-primary)] border-[var(--color-border)] bg-white cursor-pointer min-w-[160px]"
          >
            <option v-for="store in stores" :key="store.id" :value="store.id">
              {{ store.store_name }} ({{ store.marketplace === 'trendyol' ? 'Trendyol' : store.marketplace }})
            </option>
          </select>
        </div>
      </div>

      <!-- ─── Global Date Range Picker ──────────────────────────────────────── -->
      <DateRangePicker />
    </div>


    <!-- ─── AI Chatbot Assistant Widget ───────────────────────────────────────── -->
    <div class="bg-white rounded-3xl border border-[var(--color-border)] shadow-sm overflow-hidden flex flex-col md:grid md:grid-cols-3 flex-1 min-h-[500px]">
      
      <!-- LEFT / MAIN: Chat Area (Takes 2/3 space on desktop) -->
      <div class="col-span-2 flex flex-col h-full overflow-hidden border-r border-[var(--color-border)]">
        
        <!-- Chat header status -->
        <div class="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between bg-slate-50/50 flex-shrink-0">
          <div class="flex items-center gap-2.5">
            <div 
              class="w-2.5 h-2.5 rounded-full" 
              :class="activeMode ? 'bg-indigo-500 animate-pulse' : 'bg-slate-300'"
            />
            <span class="text-xs font-bold text-[var(--color-text-secondary)]">
              {{ activeMode ? `${activeMode === 'returns' ? 'İadeler' : activeMode === 'general' ? 'Genel Gelişim' : 'Fiyatlandırma'} Analiz Modu` : 'Analiz Seçimi Bekleniyor' }}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <!-- Time window badge -->
            <span class="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-[var(--color-text-secondary)] border border-[var(--color-border)] flex items-center gap-1">
              <svg class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/>
              </svg>
              {{ shortLabel }}
            </span>
            <span 
              v-if="activeMode"
              class="text-[10px] font-semibold px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100 uppercase tracking-wider"
            >
              Sohbet Kilidi Aktif
            </span>
          </div>
        </div>

        <!-- Chat screen scroll area -->
        <div 
          ref="chatContainer"
          class="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/10"
        >
          <div
            v-for="msg in chatMessages"
            :key="msg.id"
            class="flex flex-col"
            :class="{
              'items-end': msg.sender === 'user',
              'items-start': msg.sender === 'ai',
              'items-center py-2': msg.sender === 'system'
            }"
          >
            <!-- Sender tag -->
            <span 
              v-if="msg.sender !== 'system'"
              class="text-[10px] font-bold text-[var(--color-text-muted)] mb-1 px-1"
            >
              {{ msg.sender === 'user' ? 'Siz' : 'Hueilys YZ' }}
            </span>

            <!-- Message bubble -->
            <div
              v-if="msg.sender !== 'system'"
              class="max-w-[85%] rounded-2xl px-4 py-3 text-xs shadow-2xs relative leading-relaxed"
              :class="[
                msg.sender === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-none' 
                  : 'bg-white text-[var(--color-text-primary)] border border-[var(--color-border)] rounded-tl-none'
              ]"
            >
              <!-- Thinking loader animation -->
              <div v-if="msg.isThinking" class="flex items-center gap-2">
                <span class="flex h-2 w-2 relative">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                <span class="text-xs text-[var(--color-text-secondary)] italic">{{ msg.text }}</span>
              </div>

              <!-- Full Markdown Renderer -->
              <div
                v-else
                class="md-content"
                v-html="parseMarkdown(msg.text)"
              />
            </div>

            <!-- System notice display -->
            <div 
              v-else 
              class="px-4 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-[10px] text-[var(--color-text-secondary)] font-semibold flex items-center gap-1.5"
            >
              {{ msg.text }}
            </div>
          </div>
        </div>

        <!-- Chat input form -->
        <form 
          class="p-4 border-t border-[var(--color-border)] bg-white flex gap-2 flex-shrink-0"
          @submit.prevent="handleSendMessage"
        >
          <input
            v-model="chatInput"
            type="text"
            :placeholder="activeMode ? 'Sadece bu analiz alanında soru sorabilirsiniz...' : 'Lütfen analiz başlatmak için sağdan alan seçin...'"
            class="form-input rounded-xl flex-1 text-xs"
            :disabled="isAiResponding || !activeMode"
          />
          <button
            type="submit"
            class="btn btn-primary py-2 px-5 rounded-xl flex items-center justify-center"
            :disabled="!chatInput.trim() || isAiResponding || !activeMode"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </form>

      </div>

      <!-- RIGHT: Three analysis areas sidebar (Takes 1/3 space on desktop) -->
      <div class="bg-slate-50 p-6 space-y-6 flex flex-col justify-between h-full overflow-y-auto">
        <div class="space-y-4">
          <div class="space-y-1">
            <p class="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Analiz Alanları</p>
            <p class="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              Yalnızca aşağıdaki 3 alanda analiz yapabilirsiniz. Tıklayarak YZ raporunu oluşturun.
            </p>
          </div>

          <div class="flex flex-col gap-3">
            <!-- Mode 1: Returns -->
            <button
              type="button"
              class="w-full text-left p-4 rounded-2xl border transition-all cursor-pointer bg-white text-slate-800"
              :class="[
                activeMode === 'returns' 
                  ? 'border-indigo-500 shadow-md ring-2 ring-indigo-500/20' 
                  : 'border-[var(--color-border)] hover:border-slate-300 hover:shadow-xs',
                !canAfford('ai_returns') ? 'opacity-60' : ''
              ]"
              :disabled="isAiResponding"
              @click="triggerAnalysis('returns')"
            >
              <div class="flex items-center gap-3 mb-2">
                <span class="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
                  </svg>
                </span>
                <span class="font-bold text-xs flex-1">İadeler İçin Öneriler</span>
                <span
                  class="text-[9px] font-bold px-2 py-0.5 rounded-full"
                  :class="canAfford('ai_returns') ? 'bg-indigo-50 text-indigo-600' : 'bg-red-50 text-red-500'"
                >{{ CREDIT_COSTS.ai_returns }} Kredi</span>
              </div>
              <p class="text-[10px] text-[var(--color-text-secondary)] leading-relaxed">
                Müşterilerin iade sebeplerini ve ürün iade frekanslarını analiz eder, azaltıcı eylemler sunar.
              </p>
            </button>

            <!-- Mode 2: General Suggestions -->
            <button
              type="button"
              class="w-full text-left p-4 rounded-2xl border transition-all cursor-pointer bg-white text-slate-800"
              :class="[
                activeMode === 'general' 
                  ? 'border-indigo-500 shadow-md ring-2 ring-indigo-500/20' 
                  : 'border-[var(--color-border)] hover:border-slate-300 hover:shadow-xs',
                !canAfford('ai_general') ? 'opacity-60' : ''
              ]"
              :disabled="isAiResponding"
              @click="triggerAnalysis('general')"
            >
              <div class="flex items-center gap-3 mb-2">
                <span class="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </span>
                <span class="font-bold text-xs flex-1">Genel Öneriler</span>
                <span
                  class="text-[9px] font-bold px-2 py-0.5 rounded-full"
                  :class="canAfford('ai_general') ? 'bg-indigo-50 text-indigo-600' : 'bg-red-50 text-red-500'"
                >{{ CREDIT_COSTS.ai_general }} Kredi</span>
              </div>
              <p class="text-[10px] text-[var(--color-text-secondary)] leading-relaxed">
                Kargo, paketleme kalitesi, sepet ortalaması (AOV) ve son yorumlardaki puanları inceler.
              </p>
            </button>

            <!-- Mode 3: Pricing Suggestions -->
            <button
              type="button"
              class="w-full text-left p-4 rounded-2xl border transition-all cursor-pointer bg-white text-slate-800"
              :class="[
                activeMode === 'pricing' 
                  ? 'border-indigo-500 shadow-md ring-2 ring-indigo-500/20' 
                  : 'border-[var(--color-border)] hover:border-slate-300 hover:shadow-xs',
                !canAfford('ai_pricing') ? 'opacity-60' : ''
              ]"
              :disabled="isAiResponding"
              @click="triggerAnalysis('pricing')"
            >
              <div class="flex items-center gap-3 mb-2">
                <span class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M7 7h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2zM9 16v-3a1 1 0 011-1h4a1 1 0 011 1v3" />
                  </svg>
                </span>
                <span class="font-bold text-xs flex-1">Fiyatlandırma Önerileri</span>
                <span
                  class="text-[9px] font-bold px-2 py-0.5 rounded-full"
                  :class="canAfford('ai_pricing') ? 'bg-indigo-50 text-indigo-600' : 'bg-red-50 text-red-500'"
                >{{ CREDIT_COSTS.ai_pricing }} Kredi</span>
              </div>
              <p class="text-[10px] text-[var(--color-text-secondary)] leading-relaxed">
                Kâr marjlarını, komisyon oranlarını ve sürüm kazanmak/buy-box almak için ideal fiyatları hesaplar.
              </p>
            </button>
          </div>
        </div>

        <!-- Footnote status indicator -->
        <div class="pt-4 border-t border-slate-200 hidden md:block">
          <div class="flex items-center gap-2">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span class="text-[9px] font-bold text-[var(--color-text-secondary)]">YZ Analiz Motoru Aktif</span>
          </div>
        </div>
      </div>

    </div>

  </div>
</template>

<style scoped>
/* Page input adjustments */
input:disabled,
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ─── Markdown renderer styles ───────────────────────────────────────────── */
.md-content {
  font-size: 0.75rem;
  line-height: 1.6;
  color: var(--color-text-primary);
}

.md-content .md-h2 {
  font-size: 0.875rem;
  font-weight: 700;
  color: #3730a3;
  margin-top: 0.75rem;
  margin-bottom: 0.375rem;
}

.md-content .md-h3 {
  font-size: 0.8125rem;
  font-weight: 700;
  color: #4338ca;
  margin-top: 0.625rem;
  margin-bottom: 0.25rem;
}

.md-content .md-h4 {
  font-size: 0.75rem;
  font-weight: 700;
  color: #4f46e5;
  margin-top: 0.5rem;
  margin-bottom: 0.125rem;
}

.md-content .md-p {
  margin-bottom: 0.25rem;
}

.md-content .md-ol {
  list-style: decimal;
  padding-left: 1.25rem;
  margin: 0.375rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.md-content .md-ul {
  list-style: disc;
  padding-left: 1.25rem;
  margin: 0.375rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.md-content li {
  line-height: 1.55;
}

.md-content .md-li-nested {
  list-style: circle;
  margin-left: 0.75rem;
}

.md-content .md-hr {
  border: none;
  border-top: 1px solid #e2e8f0;
  margin: 0.5rem 0;
}

.md-content .md-spacer {
  height: 0.25rem;
}

.md-content .inline-code {
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 0.25rem;
  padding: 0 0.25rem;
  font-family: monospace;
  font-size: 0.7rem;
}

.md-content strong {
  font-weight: 700;
  color: inherit;
}
</style>
