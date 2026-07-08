<script setup lang="ts">
/**
 * CreditModal.vue — Kredi bilgisi + hızlı yükleme modalı.
 * Kredi maliyetlerini listeler, demo amaçlı kredi ekleme butonları içerir.
 */
import { CREDIT_COSTS } from '~/composables/useCredits'

const emit = defineEmits<{ close: [] }>()
const { balance, formattedBalance, addCredits } = useCredits()

const packages = [
  { label: '50 Kredi',  amount: 50,  price: '₺19', badge: '' },
  { label: '150 Kredi', amount: 150, price: '₺49', badge: 'Popüler' },
  { label: '500 Kredi', amount: 500, price: '₺149', badge: 'En İyi Değer' },
]

const costItems = [
  { label: 'İade Analizi (YZ)',         cost: CREDIT_COSTS.ai_returns,    icon: '↩️' },
  { label: 'Genel Gelişim Analizi (YZ)', cost: CREDIT_COSTS.ai_general,    icon: '📈' },
  { label: 'Fiyatlandırma Analizi (YZ)', cost: CREDIT_COSTS.ai_pricing,    icon: '🏷️' },
  { label: 'Toplu Fiyat Güncelleme',     cost: CREDIT_COSTS.bulk_update,   icon: '⚡' },
  { label: 'Tekil Ürün Düzenleme',       cost: CREDIT_COSTS.single_edit,   icon: '✏️' },
  { label: 'Grup Fiyat Güncelleme',      cost: CREDIT_COSTS.group_update,  icon: '🗂️' },
]

function handleAdd(amount: number) {
  addCredits(amount)
}

// Close on backdrop click
function onBackdrop(e: MouseEvent) {
  if ((e.target as HTMLElement).dataset.backdrop) emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div
      class="cm-overlay"
      data-backdrop="1"
      @click="onBackdrop"
    >
      <div class="cm-panel" role="dialog" aria-modal="true" aria-labelledby="credit-modal-title">

        <!-- Header -->
        <div class="cm-header">
          <div class="cm-header__left">
            <div class="cm-header__icon">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm0 2c1.657 0 3 .672 3 1.5S11.657 7 10 7 7 6.328 7 5.5 8.343 4 10 4zm0 9c-2.21 0-4-.9-4-2v-1c.87.7 2.3 1 4 1s3.13-.3 4-1v1c0 1.1-1.79 2-4 2zm0-4c-2.21 0-4-.9-4-2v-1c.87.7 2.3 1 4 1s3.13-.3 4-1v1c0 1.1-1.79 2-4 2z"/>
              </svg>
            </div>
            <div>
              <h2 id="credit-modal-title" class="cm-header__title">Kredi Bakiyesi</h2>
              <p class="cm-header__sub">Hueilys yapay zeka ve otomasyon servisleri</p>
            </div>
          </div>
          <button class="cm-close" aria-label="Kapat" @click="emit('close')">
            <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
          </button>
        </div>

        <!-- Balance hero -->
        <div class="cm-balance">
          <div class="cm-balance__amount">
            <span class="cm-balance__number">{{ formattedBalance }}</span>
            <span class="cm-balance__unit">Kredi</span>
          </div>
          <p class="cm-balance__hint" :class="balance < 10 ? 'text-red-500' : ''">
            {{ balance < 10 ? '⚠️ Bakiyeniz kritik düzeyde düşük!' : 'Mevcut bakiyeniz' }}
          </p>
        </div>

        <!-- Cost table -->
        <div class="cm-section">
          <p class="cm-section__title">İşlem Ücretleri</p>
          <div class="cm-costs">
            <div v-for="item in costItems" :key="item.label" class="cm-cost-row">
              <span class="cm-cost-row__emoji">{{ item.icon }}</span>
              <span class="cm-cost-row__label">{{ item.label }}</span>
              <span class="cm-cost-row__cost">{{ item.cost }} Kredi</span>
            </div>
          </div>
        </div>

        <!-- Packages -->
        <div class="cm-section">
          <p class="cm-section__title">Kredi Yükle</p>
          <div class="cm-packages">
            <button
              v-for="pkg in packages"
              :key="pkg.amount"
              class="cm-pkg"
              :class="pkg.badge === 'Popüler' ? 'cm-pkg--featured' : ''"
              @click="handleAdd(pkg.amount)"
            >
              <span v-if="pkg.badge" class="cm-pkg__badge">{{ pkg.badge }}</span>
              <span class="cm-pkg__amount">{{ pkg.label }}</span>
              <span class="cm-pkg__price">{{ pkg.price }}</span>
            </button>
          </div>
          <p class="cm-note">Demo mod — kredi yükleme gerçek ödeme içermez.</p>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* Overlay */
.cm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(4px);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  animation: cm-fade-in 0.15s ease;
}

@keyframes cm-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* Panel */
.cm-panel {
  background: white;
  border-radius: 20px;
  box-shadow: 0 24px 80px rgba(0,0,0,0.2);
  width: 100%;
  max-width: 420px;
  overflow: hidden;
  animation: cm-slide-up 0.2s ease;
}

@keyframes cm-slide-up {
  from { opacity: 0; transform: translateY(16px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* Header */
.cm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 0;
}

.cm-header__left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cm-header__icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.cm-header__icon svg {
  width: 20px;
  height: 20px;
}

.cm-header__title {
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
}

.cm-header__sub {
  font-size: 11px;
  color: #94a3b8;
  margin: 2px 0 0;
}

.cm-close {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #f1f5f9;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  transition: background 0.15s;
  flex-shrink: 0;
}

.cm-close:hover { background: #e2e8f0; }
.cm-close svg { width: 16px; height: 16px; }

/* Balance hero */
.cm-balance {
  text-align: center;
  padding: 24px 20px 16px;
  background: linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(139,92,246,0.04) 100%);
  margin: 16px 20px;
  border-radius: 14px;
  border: 1px solid rgba(99,102,241,0.12);
}

.cm-balance__amount {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 6px;
}

.cm-balance__number {
  font-size: 42px;
  font-weight: 900;
  color: #6366f1;
  letter-spacing: -2px;
  line-height: 1;
}

.cm-balance__unit {
  font-size: 14px;
  font-weight: 700;
  color: #8b5cf6;
  margin-bottom: 4px;
}

.cm-balance__hint {
  font-size: 11px;
  color: #94a3b8;
  margin: 8px 0 0;
  font-weight: 500;
}

/* Sections */
.cm-section {
  padding: 0 20px 16px;
}

.cm-section__title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #94a3b8;
  margin: 0 0 10px;
}

/* Cost table */
.cm-costs {
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.cm-cost-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 14px;
  border-bottom: 1px solid #f1f5f9;
}

.cm-cost-row:last-child { border-bottom: none; }

.cm-cost-row__emoji {
  font-size: 14px;
  width: 20px;
  text-align: center;
  flex-shrink: 0;
}

.cm-cost-row__label {
  flex: 1;
  font-size: 12px;
  font-weight: 500;
  color: #334155;
}

.cm-cost-row__cost {
  font-size: 11.5px;
  font-weight: 700;
  color: #6366f1;
  white-space: nowrap;
  background: rgba(99,102,241,0.08);
  padding: 2px 8px;
  border-radius: 6px;
}

/* Packages */
.cm-packages {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.cm-pkg {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px 8px;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  background: white;
  cursor: pointer;
  transition: all 0.15s;
}

.cm-pkg:hover {
  border-color: #6366f1;
  background: rgba(99,102,241,0.04);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99,102,241,0.12);
}

.cm-pkg--featured {
  border-color: #6366f1;
  background: linear-gradient(135deg, rgba(99,102,241,0.06), rgba(139,92,246,0.05));
}

.cm-pkg__badge {
  position: absolute;
  top: -8px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 9px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 10px;
  background: linear-gradient(90deg, #6366f1, #8b5cf6);
  color: white;
  white-space: nowrap;
}

.cm-pkg__amount {
  font-size: 12px;
  font-weight: 700;
  color: #1e293b;
}

.cm-pkg__price {
  font-size: 14px;
  font-weight: 800;
  color: #6366f1;
}

/* Note */
.cm-note {
  font-size: 10px;
  color: #cbd5e1;
  text-align: center;
  margin: 10px 0 0;
}
</style>
