/**
 * auth.ts — Route middleware to protect pages that require authentication.
 * Usage: definePageMeta({ middleware: 'auth' }) on protected pages.
 * Redirects unauthenticated users to the landing page login section.
 */

export default defineNuxtRouteMiddleware(() => {
  const user = useSupabaseUser()

  if (!user.value) {
    return navigateTo('/#login')
  }
})
