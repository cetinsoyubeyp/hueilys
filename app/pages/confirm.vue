<script setup lang="ts">
/**
 * confirm.vue — Supabase OAuth / email confirmation callback page.
 * @nuxtjs/supabase handles the token exchange automatically.
 * This page simply shows a loading state then redirects to the app.
 */

const user = useSupabaseUser()

// Once the user object is populated after token exchange, redirect to home
watchEffect(() => {
  if (user.value) {
    navigateTo('/')
  }
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-hero-gradient">
    <div class="text-center">
      <div class="w-12 h-12 border-2 border-[var(--color-primary-lighter)] border-t-[var(--color-primary)] rounded-full animate-spin mx-auto mb-4" aria-hidden="true" />
      <p class="text-[var(--color-text-secondary)] text-sm">Confirming your account…</p>
    </div>
  </div>
</template>
