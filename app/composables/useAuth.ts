/**
 * useAuth — Supabase authentication composable.
 * Wraps all auth operations: signIn, signUp, signOut, OAuth.
 * Provides reactive error and loading states.
 */

import type { AuthError } from '~/types'

export function useAuth() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const isLoading = ref(false)
  const error = ref<AuthError | null>(null)

  function clearError() {
    error.value = null
  }

  // ─── Email / Password Sign In ─────────────────────────────────────────────────

  async function signInWithEmail(email: string, password: string) {
    isLoading.value = true
    clearError()

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (authError) {
      error.value = { message: mapAuthError(authError.message), code: authError.status?.toString() }
    }

    isLoading.value = false
    return !authError
  }

  // ─── Email / Password Sign Up ─────────────────────────────────────────────────

  async function signUpWithEmail(email: string, password: string, fullName: string) {
    isLoading.value = true
    clearError()

    const { error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim() },
      },
    })

    if (authError) {
      error.value = { message: mapAuthError(authError.message), code: authError.status?.toString() }
    }

    isLoading.value = false
    return !authError
  }

  // ─── OAuth ────────────────────────────────────────────────────────────────────

  async function signInWithGoogle() {
    isLoading.value = true
    clearError()

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/confirm`,
      },
    })

    if (authError) {
      error.value = { message: mapAuthError(authError.message) }
      isLoading.value = false
    }
  }

  async function signInWithGitHub() {
    isLoading.value = true
    clearError()

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/confirm`,
      },
    })

    if (authError) {
      error.value = { message: mapAuthError(authError.message) }
      isLoading.value = false
    }
  }

  // ─── Sign Out ─────────────────────────────────────────────────────────────────

  async function signOut() {
    isLoading.value = true
    await supabase.auth.signOut()
    if (import.meta.client) {
      localStorage.removeItem('hueilys_credits')
    }
    isLoading.value = false
  }

  // ─── Error Message Mapping ────────────────────────────────────────────────────

  function mapAuthError(message: string): string {
    const errorMap: Record<string, string> = {
      'Invalid login credentials': 'Incorrect email or password.',
      'Email not confirmed': 'Please confirm your email address first.',
      'User already registered': 'Registration failed. Please check your credentials or try logging in.',
      'Password should be at least 6 characters': 'Password must be at least 6 characters.',
      'Unable to validate email address: invalid format': 'Please enter a valid email address.',
      'signup_disabled': 'New registrations are temporarily disabled.',
    }

    return errorMap[message] ?? message
  }

  return {
    user,
    isLoading,
    error,
    clearError,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInWithGitHub,
    signOut,
  }
}
