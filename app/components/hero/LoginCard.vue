<script setup lang="ts">
/**
 * LoginCard — Supabase-connected auth card.
 * Tabs: Login ↔ Register, Email/Password + Google + GitHub OAuth.
 * Reactive error display, loading states, password visibility toggle.
 */

import type { AuthMode } from '~/types'

const { signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithGitHub, isLoading, error, clearError } = useAuth()

// ─── Tab state ────────────────────────────────────────────────────────────────
const mode = ref<AuthMode>('login')

function switchMode(newMode: AuthMode) {
  mode.value = newMode
  clearError()
  resetForms()
}

// ─── Login form ───────────────────────────────────────────────────────────────
const loginEmail = ref('')
const loginPassword = ref('')
const rememberMe = ref(false)
const showLoginPassword = ref(false)
const loginSuccess = ref(false)

// ─── Register form ────────────────────────────────────────────────────────────
const registerName = ref('')
const registerEmail = ref('')
const registerPassword = ref('')
const registerConfirm = ref('')
const showRegisterPassword = ref(false)
const registerSuccess = ref(false)

// ─── Validation ───────────────────────────────────────────────────────────────
const registerPasswordMismatch = computed(
  () => registerConfirm.value.length > 0 && registerPassword.value !== registerConfirm.value
)

// ─── Handlers ─────────────────────────────────────────────────────────────────
async function handleLogin() {
  if (!loginEmail.value || !loginPassword.value) return
  const ok = await signInWithEmail(loginEmail.value, loginPassword.value)
  if (ok) {
    loginSuccess.value = true
    // Animasyon 3 saniye sürer, sonra dashboard'a yönlendir
    setTimeout(() => navigateTo('/dashboard'), 3000)
  }
}

async function handleRegister() {
  if (registerPasswordMismatch.value) return
  if (!registerName.value || !registerEmail.value || !registerPassword.value) return

  const ok = await signUpWithEmail(registerEmail.value, registerPassword.value, registerName.value)
  if (ok) registerSuccess.value = true
}

async function handleGoogle() {
  await signInWithGoogle()
}

async function handleGitHub() {
  await signInWithGitHub()
}

function resetForms() {
  loginEmail.value = ''
  loginPassword.value = ''
  rememberMe.value = false
  showLoginPassword.value = false
  registerName.value = ''
  registerEmail.value = ''
  registerPassword.value = ''
  registerConfirm.value = ''
  showRegisterPassword.value = false
  registerSuccess.value = false
}

// ─── Password strength ────────────────────────────────────────────────────────
const passwordStrength = computed(() => {
  const p = registerPassword.value
  if (!p) return 0
  let score = 0
  if (p.length >= 8) score++
  if (/[A-Z]/.test(p)) score++
  if (/[0-9]/.test(p)) score++
  if (/[^A-Za-z0-9]/.test(p)) score++
  return score
})

const strengthLabel = computed(() => ['', 'Weak', 'Fair', 'Good', 'Strong'][passwordStrength.value])
const strengthColor = computed(() =>
  ['', '#ef4444', '#f59e0b', '#3b82f6', '#22c55e'][passwordStrength.value]
)
</script>

<template>
  <div
    id="login"
    class="glass-card w-full p-7 md:p-8"
    role="region"
    :aria-label="mode === 'login' ? 'Login form' : 'Register form'"
  >

    <!-- ─── LOGIN SUCCESS ANİMASYONU ───────────────────────────── -->
    <LoginSuccessAnimation :show="loginSuccess" />

    <!-- İçerik — başarı animasyonu aktifken gizle -->
    <template v-if="!loginSuccess">

    <!-- Tab switcher -->
    <div class="flex gap-1 p-1 bg-[var(--color-primary-lightest)] rounded-xl mb-6">
      <button
        type="button"
        :class="[
          'flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-200',
          mode === 'login'
            ? 'bg-white text-[var(--color-primary)] shadow-sm'
            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]',
        ]"
        @click="switchMode('login')"
        aria-pressed="mode === 'login'"
      >
        Giriş Yap
      </button>
      <button
        type="button"
        :class="[
          'flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-200',
          mode === 'register'
            ? 'bg-white text-[var(--color-primary)] shadow-sm'
            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]',
        ]"
        @click="switchMode('register')"
        aria-pressed="mode === 'register'"
      >
        Hesap Oluştur
      </button>
    </div>

    <!-- Global error -->
    <Transition
      enter-active-class="transition-all duration-200"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="error"
        class="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-100 mb-4"
        role="alert"
        aria-live="polite"
      >
        <svg class="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke-width="1.75"/>
          <path stroke-linecap="round" stroke-width="1.75" d="M12 8v4M12 16h.01"/>
        </svg>
        <p class="text-sm text-red-600 leading-snug">{{ error.message }}</p>
        <button
          type="button"
          class="ml-auto text-red-400 hover:text-red-600 transition-colors flex-shrink-0"
          aria-label="Dismiss error"
          @click="clearError"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </Transition>

    <!-- ─── LOGIN FORM ──────────────────────────────────────────────────────── -->
    <Transition
      mode="out-in"
      enter-active-class="transition-all duration-200"
      enter-from-class="opacity-0 translate-x-2"
      enter-to-class="opacity-100 translate-x-0"
      leave-active-class="transition-all duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0 -translate-x-2"
    >
      <form
        v-if="mode === 'login'"
        key="login"
        class="space-y-4"
        novalidate
        @submit.prevent="handleLogin"
      >
        <!-- Email -->
        <div>
          <label for="login-email" class="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
            E-posta adresi
          </label>
          <input
            id="login-email"
            v-model="loginEmail"
            type="email"
            class="form-input"
            placeholder="siz@ornek.com"
            autocomplete="email"
            required
            aria-required="true"
          />
        </div>

        <!-- Password -->
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label for="login-password" class="block text-sm font-medium text-[var(--color-text-secondary)]">
              Şifre
            </label>
            <a href="#" class="text-xs text-[var(--color-primary)] hover:underline font-medium">
              Şifremi unuttum?
            </a>
          </div>
          <div class="relative">
            <input
              id="login-password"
              v-model="loginPassword"
              :type="showLoginPassword ? 'text' : 'password'"
              class="form-input pr-11"
              placeholder="Şifrenizi girin"
              autocomplete="current-password"
              required
              aria-required="true"
            />
            <button
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
              :aria-label="showLoginPassword ? 'Hide password' : 'Show password'"
              @click="showLoginPassword = !showLoginPassword"
            >
              <svg v-if="!showLoginPassword" class="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
              <svg v-else class="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Remember me -->
        <div class="flex items-center gap-2.5">
          <input
            id="remember-me"
            v-model="rememberMe"
            type="checkbox"
            class="w-4 h-4 rounded border-[var(--color-border)] accent-[var(--color-primary)] cursor-pointer"
          />
          <label for="remember-me" class="text-sm text-[var(--color-text-secondary)] cursor-pointer select-none">
            30 gün boyunca beni hatırla
          </label>
        </div>

        <!-- Submit -->
        <button
          type="submit"
          class="btn btn-primary w-full py-2.5 gap-2"
          :disabled="isLoading || !loginEmail || !loginPassword"
          :aria-busy="isLoading"
        >
          <span v-if="isLoading" class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
          {{ isLoading ? 'Giriş yapılıyor…' : 'Giriş Yap' }}
        </button>
      </form>

      <!-- ─── REGISTER FORM ───────────────────────────────────────────────── -->
      <div v-else-if="mode === 'register'" key="register">

        <!-- Success state -->
        <Transition
          enter-active-class="transition-all duration-300"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
        >
          <div v-if="registerSuccess" class="text-center py-6" role="status" aria-live="polite">
            <div class="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-4">
              <svg class="w-7 h-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <h3 class="text-title text-[var(--color-text-primary)] mb-2">E-postanızı kontrol edin!</h3>
            <p class="text-sm text-[var(--color-text-secondary)]">
              <strong>{{ registerEmail }}</strong> adresine bir onay bağlantısı gönderdik.<br/>
              Hesabınızı etkinleştirmek için tıklayın.
            </p>
            <button
              type="button"
              class="btn btn-ghost text-sm mt-4"
              @click="switchMode('login')"
            >
              Girişe dön
            </button>
          </div>
        </Transition>

        <form
          v-if="!registerSuccess"
          class="space-y-4"
          novalidate
          @submit.prevent="handleRegister"
        >
          <!-- Full name -->
          <div>
            <label for="reg-name" class="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
              Ad Soyad
            </label>
            <input
              id="reg-name"
              v-model="registerName"
              type="text"
              class="form-input"
              placeholder="Ahmet Yılmaz"
              autocomplete="name"
              required
              aria-required="true"
            />
          </div>

          <!-- Email -->
          <div>
            <label for="reg-email" class="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
              E-posta adresi
            </label>
            <input
              id="reg-email"
              v-model="registerEmail"
              type="email"
              class="form-input"
              placeholder="siz@ornek.com"
              autocomplete="email"
              required
              aria-required="true"
            />
          </div>

          <!-- Password -->
          <div>
            <label for="reg-password" class="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
              Şifre
            </label>
            <div class="relative">
              <input
                id="reg-password"
                v-model="registerPassword"
                :type="showRegisterPassword ? 'text' : 'password'"
                class="form-input pr-11"
                placeholder="En az 6 karakter"
                autocomplete="new-password"
                required
                aria-required="true"
                :aria-describedby="registerPassword ? 'password-strength' : undefined"
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
                :aria-label="showRegisterPassword ? 'Hide password' : 'Show password'"
                @click="showRegisterPassword = !showRegisterPassword"
              >
                <svg v-if="!showRegisterPassword" class="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                </svg>
                <svg v-else class="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                </svg>
              </button>
            </div>

            <!-- Password strength bar -->
            <div v-if="registerPassword" id="password-strength" class="mt-2" aria-live="polite">
              <div class="flex gap-1 mb-1">
                <div
                  v-for="i in 4"
                  :key="i"
                  class="h-1 flex-1 rounded-full transition-all duration-300"
                  :style="{
                    background: i <= passwordStrength ? strengthColor : 'var(--color-border)',
                  }"
                />
              </div>
              <p class="text-xs font-medium" :style="{ color: strengthColor }">
                {{ strengthLabel }}
              </p>
            </div>
          </div>

          <!-- Confirm password -->
          <div>
            <label for="reg-confirm" class="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
              Şifre Tekrar
            </label>
            <input
              id="reg-confirm"
              v-model="registerConfirm"
              type="password"
              :class="['form-input', registerPasswordMismatch ? 'border-red-400 focus:border-red-500 focus:shadow-red-100' : '']"
              placeholder="Şifrenizi tekrar girin"
              autocomplete="new-password"
              required
              aria-required="true"
              :aria-invalid="registerPasswordMismatch"
            />
            <p v-if="registerPasswordMismatch" class="text-xs text-red-500 mt-1" role="alert">
              Şifreler eşleşmiyor.
            </p>
          </div>

          <!-- Submit -->
          <button
            type="submit"
            class="btn btn-primary w-full py-2.5 gap-2"
            :disabled="isLoading || registerPasswordMismatch || !registerName || !registerEmail || !registerPassword"
            :aria-busy="isLoading"
          >
            <span v-if="isLoading" class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
            {{ isLoading ? 'Hesap oluşturuluyor…' : 'Hesap Oluştur' }}
          </button>
        </form>

      </div>
    </Transition>

    <!-- ─── DIVIDER + OAUTH ──────────────────────────────────────────────────── -->
    <template v-if="!registerSuccess">
      <div class="divider my-5 text-xs">veya şununla devam et</div>

      <div class="grid grid-cols-2 gap-3">
        <button
          type="button"
          class="btn btn-ghost text-sm py-2.5 gap-2"
          :disabled="isLoading"
          aria-label="Google ile devam et"
          @click="handleGoogle"
        >
          <svg class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google
        </button>

        <button
          type="button"
          class="btn btn-ghost text-sm py-2.5 gap-2"
          :disabled="isLoading"
          aria-label="GitHub ile devam et"
          @click="handleGitHub"
        >
          <svg class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
          </svg>
          GitHub
        </button>
      </div>
    </template>

    <!-- ─── kapanış: v-if="!loginSuccess" ─── -->
    </template>

  </div>
</template>
