<script setup lang="ts">
/**
 * CreditBadge.vue — Topbar'da gösterilen kredi bakiyesi + artı butonu.
 * Tıklanınca CreditModal açılır.
 */
import { CREDIT_COSTS } from '~/composables/useCredits'

const { formattedBalance, balance } = useCredits()

const emit = defineEmits<{ 'open-modal': [] }>()

// Kırmızıya dön eşiği
const isLow = computed(() => balance.value < 10)
</script>

<template>
  <button
    type="button"
    class="credit-badge"
    :class="isLow ? 'credit-badge--low' : ''"
    aria-label="`Kredi bakiyeniz: ${formattedBalance}. Kredi satın almak için tıklayın.`"
    @click="emit('open-modal')"
  >
    <!-- Coin icon -->
    <svg class="credit-badge__icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm0 2c1.657 0 3 .672 3 1.5S11.657 7 10 7 7 6.328 7 5.5 8.343 4 10 4zm0 9c-2.21 0-4-.9-4-2v-1c.87.7 2.3 1 4 1s3.13-.3 4-1v1c0 1.1-1.79 2-4 2zm0-4c-2.21 0-4-.9-4-2v-1c.87.7 2.3 1 4 1s3.13-.3 4-1v1c0 1.1-1.79 2-4 2z"/>
    </svg>

    <span class="credit-badge__balance">{{ formattedBalance }}</span>
    <span class="credit-badge__label">Kredi</span>

    <!-- Plus button -->
    <span class="credit-badge__plus" aria-hidden="true">
      <svg viewBox="0 0 12 12" fill="currentColor">
        <path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
      </svg>
    </span>
  </button>
</template>

<style scoped>
.credit-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px 5px 8px;
  border-radius: 10px;
  border: 1.5px solid rgba(99, 102, 241, 0.25);
  background: linear-gradient(135deg, rgba(99,102,241,0.07) 0%, rgba(139,92,246,0.06) 100%);
  color: var(--color-primary, #6366f1);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.18s ease;
  white-space: nowrap;
  user-select: none;
}

.credit-badge:hover {
  border-color: rgba(99, 102, 241, 0.5);
  background: linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.1) 100%);
  box-shadow: 0 2px 8px rgba(99,102,241,0.15);
  transform: translateY(-0.5px);
}

.credit-badge--low {
  border-color: rgba(239, 68, 68, 0.3);
  background: linear-gradient(135deg, rgba(239,68,68,0.07) 0%, rgba(220,38,38,0.05) 100%);
  color: #dc2626;
  animation: pulse-low 2s infinite;
}

@keyframes pulse-low {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.3); }
  50%       { box-shadow: 0 0 0 4px rgba(239,68,68,0); }
}

.credit-badge__icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  opacity: 0.9;
}

.credit-badge__balance {
  font-size: 13px;
  font-weight: 800;
  letter-spacing: -0.3px;
}

.credit-badge__label {
  font-size: 10px;
  font-weight: 600;
  opacity: 0.75;
  margin-left: -2px;
}

.credit-badge__plus {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  background: currentColor;
  border-radius: 4px;
  margin-left: 2px;
  opacity: 0.15;
  transition: opacity 0.15s;
}

.credit-badge__plus svg {
  width: 8px;
  height: 8px;
  color: white;
  stroke: white;
}

.credit-badge:hover .credit-badge__plus {
  opacity: 0.28;
}
</style>
