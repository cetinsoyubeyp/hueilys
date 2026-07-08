// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  future: { compatibilityVersion: 4 },
  devtools: { enabled: true },

  // Components — disable path prefix so subdirectory components resolve by filename only
  // e.g. components/layout/TheNavbar.vue → <TheNavbar /> (not <LayoutTheNavbar />)
  components: [
    {
      path: '~/components',
      pathPrefix: false,
    },
  ],

  // Modules
  modules: [
    '@nuxt/eslint',
    '@vueuse/nuxt',
    '@nuxtjs/supabase',
  ],

  // Supabase
  supabase: {
    redirect: true,
    redirectOptions: {
      login:    '/',
      callback: '/confirm',
      // Giriş gerektirmeyen sayfalar
      exclude:  ['/', '/confirm'],
    },
    cookieOptions: {
      maxAge:   60 * 60 * 8,   // 8 saat
      sameSite: 'lax',
      secure:   process.env.NODE_ENV === 'production',
    },
    clientOptions: {
      auth: {
        flowType:           'pkce',
        detectSessionInUrl: true,
        persistSession:     true,
      },
    },
  },

  // CSS
  css: ['~/assets/css/main.css'],

  // Vite config for TailwindCSS v4
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },

  // App head
  app: {
    head: {
      title: 'Hueilys — E-Commerce Analytics & Management Platform',
      htmlAttrs: { lang: 'en' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            'Manage all your e-commerce operations from a single dashboard. Sales analytics, order management, inventory, ad performance, and AI-powered insights.',
        },
        { name: 'theme-color', content: '#2563EB' },
        // Open Graph
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'Hueilys' },
        { property: 'og:title', content: 'Hueilys — E-Commerce Analytics & Management Platform' },
        {
          property: 'og:description',
          content:
            'Manage all your e-commerce operations from a single dashboard. Sales analytics, order management, inventory, ad performance, and AI-powered insights.',
        },
        // Twitter
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'Hueilys — E-Commerce Analytics Platform' },
        {
          name: 'twitter:description',
          content: 'All-in-one e-commerce analytics & management platform.',
        },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        {
          rel: 'preconnect',
          href: 'https://fonts.googleapis.com',
        },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: '',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap',
        },
      ],
    },
  },

  // Runtime config
  runtimeConfig: {
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    public: {
      appName: 'Hueilys',
      appVersion: '1.0.0',
    },
  },

  // Global Security Headers / CSP Rules
  routeRules: {
    '/**': {
      headers: {
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Content-Security-Policy': "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; connect-src 'self' https: wss:; font-src 'self' https: data:; frame-ancestors 'none';",
      }
    }
  },

  // TypeScript
  typescript: {
    strict: true,
    typeCheck: false,
  },

  // ESLint
  eslint: {
    config: {
      stylistic: false,
    },
  },
})
