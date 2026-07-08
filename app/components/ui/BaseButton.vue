<script setup lang="ts">
/**
 * BaseButton — Reusable button component.
 * Supports primary, ghost, and outline variants with loading and disabled states.
 */

interface Props {
  variant?: 'primary' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  href?: string
  external?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  loading: false,
  disabled: false,
  type: 'button',
})

const sizeClasses: Record<string, string> = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-5 py-2.5 text-[0.9375rem]',
  lg: 'px-7 py-3.5 text-base',
}

const variantClass = computed(() => `btn-${props.variant}`)
const sizeClass = computed(() => sizeClasses[props.size])
const isDisabled = computed(() => props.disabled || props.loading)
</script>

<template>
  <!-- Render as anchor when href is provided -->
  <a
    v-if="href"
    :href="href"
    :target="external ? '_blank' : undefined"
    :rel="external ? 'noopener noreferrer' : undefined"
    :class="['btn', variantClass, sizeClass, { 'opacity-60 cursor-not-allowed': isDisabled }]"
    :aria-disabled="isDisabled"
  >
    <span v-if="loading" class="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true" />
    <slot />
  </a>

  <!-- Render as button otherwise -->
  <button
    v-else
    :type="type"
    :disabled="isDisabled"
    :class="['btn', variantClass, sizeClass, { 'opacity-60 cursor-not-allowed': isDisabled }]"
    :aria-busy="loading"
  >
    <span v-if="loading" class="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true" />
    <slot />
  </button>
</template>
