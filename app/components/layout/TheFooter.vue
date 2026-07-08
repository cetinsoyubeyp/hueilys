<script setup lang="ts">
/**
 * TheFooter — Clean footer with logo, copyright, and links.
 */

import { APP_NAME, SOCIAL_LINKS, FOOTER_LINKS } from '~/constants'

const currentYear = new Date().getFullYear()
</script>

<template>
  <footer
    class="border-t border-[var(--color-border)] bg-white/60 backdrop-blur-sm"
    role="contentinfo"
  >
    <div class="container-app py-8">
      <div class="flex flex-col md:flex-row items-center justify-between gap-4">
        <!-- Logo + Copyright -->
        <div class="flex items-center gap-3">
          <div class="w-7 h-7 rounded-md bg-[var(--color-primary)] flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M3 13L6.5 7.5L9.5 10.5L13 5L15 13" stroke="white" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="15" cy="5" r="1.25" fill="#93C5FD"/>
            </svg>
          </div>
          <p class="text-sm text-[var(--color-text-muted)] m-0">
            <span class="font-semibold text-[var(--color-text-secondary)]">{{ APP_NAME }}</span>
            &nbsp;©{{ currentYear }}. Tüm hakları saklıdır.
          </p>
        </div>

        <!-- Links -->
        <nav aria-label="Footer navigation">
          <ul class="flex items-center gap-1 list-none m-0 p-0">
            <!-- Social Links -->
            <li v-for="social in SOCIAL_LINKS" :key="social.label">
              <a
                :href="social.href"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-lightest)] transition-all no-underline font-medium"
                :aria-label="`${social.label} (opens in new tab)`"
              >
                <!-- GitHub icon -->
                <svg v-if="social.icon === 'github'" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                </svg>
                {{ social.label }}
              </a>
            </li>

            <!-- Separator -->
            <li aria-hidden="true" class="w-px h-4 bg-[var(--color-border)] mx-1" />

            <!-- Policy Links -->
            <li v-for="link in FOOTER_LINKS" :key="link.label">
              <a
                :href="link.href"
                class="px-3 py-1.5 rounded-lg text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-lightest)] transition-all no-underline font-medium"
              >
                {{ link.label }}
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  </footer>
</template>
