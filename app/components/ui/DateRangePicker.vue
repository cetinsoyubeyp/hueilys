<script setup lang="ts">
/**
 * DateRangePicker.vue — Global zaman aralığı seçici bileşeni.
 * Pill-button grubu olarak render edilir.
 * useDateRange composable'ı ile global state üzerinden çalışır.
 */
import { useDateRange, DATE_RANGE_OPTIONS } from '~/composables/useDateRange'

const { selectedRange, rangeLabel, setRange } = useDateRange()
</script>

<template>
  <div class="date-range-picker">
    <!-- Pill buttons -->
    <div class="drp-pills" role="group" aria-label="Veri zaman aralığı seçici">
      <button
        v-for="opt in DATE_RANGE_OPTIONS"
        :key="opt.value"
        type="button"
        :class="['drp-pill', selectedRange === opt.value ? 'drp-pill--active' : '']"
        :aria-pressed="selectedRange === opt.value"
        @click="setRange(opt.value)"
      >
        {{ opt.label }}
      </button>
    </div>

    <!-- Info badge -->
    <div class="drp-badge" aria-live="polite">
      <svg class="drp-badge__icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/>
      </svg>
      <span>{{ rangeLabel }}</span>
      <span class="drp-badge__max">maks. 14 gün</span>
    </div>
  </div>
</template>

<style scoped>
.date-range-picker {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

/* ── Pill group ──────────────────────────────────────────── */
.drp-pills {
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--color-surface, #f8fafc);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 10px;
  padding: 3px;
}

.drp-pill {
  padding: 4px 12px;
  font-size: 11.5px;
  font-weight: 600;
  border-radius: 7px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary, #64748b);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  line-height: 1.4;
}

.drp-pill:hover:not(.drp-pill--active) {
  background: white;
  color: var(--color-text-primary, #0f172a);
}

.drp-pill--active {
  background: var(--color-primary, #6366f1);
  color: white;
  box-shadow: 0 1px 3px rgba(99, 102, 241, 0.35);
}

/* ── Info badge ──────────────────────────────────────────── */
.drp-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  background: rgba(99, 102, 241, 0.07);
  border: 1px solid rgba(99, 102, 241, 0.18);
  border-radius: 20px;
  color: var(--color-primary, #6366f1);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.drp-badge__icon {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  opacity: 0.8;
}

.drp-badge__max {
  color: var(--color-text-muted, #94a3b8);
  font-weight: 500;
  font-size: 10px;
  padding-left: 4px;
  border-left: 1px solid rgba(99, 102, 241, 0.2);
  margin-left: 2px;
}
</style>
