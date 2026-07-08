<script setup lang="ts">
/**
 * LoginSuccessAnimation — Circular fill animation on successful login.
 * Gray → Green fill over 3 seconds with a checkmark reveal.
 */

defineProps<{ show: boolean }>()
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="opacity-0 scale-75"
    enter-to-class="opacity-100 scale-100"
  >
    <div
      v-if="show"
      class="flex flex-col items-center justify-center gap-4 py-6"
      role="status"
      aria-live="polite"
      aria-label="Giriş başarılı"
    >
      <!-- Circle + tick -->
      <div class="success-wrapper">
        <svg
          class="success-svg"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <!-- Background grey track -->
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke="#E5E7EB"
            stroke-width="5"
          />

          <!-- Animated fill circle -->
          <circle
            class="success-circle"
            cx="50"
            cy="50"
            r="40"
            stroke-width="5"
            stroke-linecap="round"
            transform="rotate(-90 50 50)"
          />

          <!-- Checkmark — draws in after fill starts -->
          <path
            class="success-check"
            d="M30 50 L44 64 L70 36"
            stroke-width="5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>

      <div class="text-center">
        <p class="text-sm font-semibold text-[var(--color-text-primary)]">Giriş başarılı!</p>
        <p class="text-xs text-[var(--color-text-muted)] mt-0.5">Yönlendiriliyorsunuz…</p>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.success-wrapper {
  width: 96px;
  height: 96px;
}

.success-svg {
  width: 100%;
  height: 100%;
}

/* ─── Animated circle ──────────────────────────────────────────────────────── */
/* Circumference of r=40: 2 * π * 40 ≈ 251.33 */
.success-circle {
  stroke-dasharray: 251.33;
  stroke-dashoffset: 251.33;
  stroke: #9CA3AF; /* starts gray */
  animation:
    circle-fill  3s ease-out forwards,
    circle-color 3s ease-out forwards;
}

@keyframes circle-fill {
  0%   { stroke-dashoffset: 251.33; }
  100% { stroke-dashoffset: 0; }
}

@keyframes circle-color {
  0%   { stroke: #9CA3AF; }   /* gray-400 */
  40%  { stroke: #86EFAC; }   /* green-300 */
  100% { stroke: #22C55E; }   /* green-500 */
}

/* ─── Checkmark ──────────────────────────────────────────────────────────────── */
/* Path length ~60 */
.success-check {
  stroke: #9CA3AF;
  stroke-dasharray: 60;
  stroke-dashoffset: 60;
  animation:
    check-draw  0.5s ease-out 1.2s forwards,
    check-color 1.8s ease-out 1.2s forwards;
}

@keyframes check-draw {
  0%   { stroke-dashoffset: 60; }
  100% { stroke-dashoffset: 0; }
}

@keyframes check-color {
  0%   { stroke: #86EFAC; }
  100% { stroke: #16A34A; } /* green-600 */
}
</style>
