<script setup lang="ts">
/**
 * index.vue — Landing page root.
 * Composes all sections and provides full SEO metadata.
 */

useSeoMeta({
  title: 'Hueilys — E-Commerce Analytics & Management Platform',
  description:
    'Manage all your e-commerce operations from a single dashboard. Real-time sales analytics, order management, inventory, ad performance, and AI-powered insights.',
  ogTitle: 'Hueilys — E-Commerce Analytics & Management Platform',
  ogDescription:
    'All-in-one e-commerce analytics & management platform. Track revenue, manage orders, and grow with AI insights.',
  ogType: 'website',
  ogSiteName: 'Hueilys',
  twitterCard: 'summary_large_image',
  twitterTitle: 'Hueilys — E-Commerce Analytics Platform',
  twitterDescription:
    'All-in-one e-commerce analytics & management platform for modern sellers.',
})

// JSON-LD Structured Data
useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'Hueilys',
        applicationCategory: 'BusinessApplication',
        description: 'E-Commerce Analytics & Management Platform for online sellers.',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
          description: '14-day free trial, no credit card required.',
        },
      }),
    },
  ],
})
</script>

<template>
  <div>
    <TheNavbar />

    <main id="main-content">
      <HeroSection />
      <FeaturesSection />
      <PlatformPreview />
    </main>

    <TheFooter />
  </div>
</template>
