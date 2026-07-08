/**
 * useScrollAnimation — GSAP ScrollTrigger wrapper composable.
 * Provides reusable fade-in and slide-up animation helpers.
 */

import { onMounted, onUnmounted } from 'vue'
import type { Ref } from 'vue'

interface ScrollAnimationOptions {
  delay?: number
  duration?: number
  y?: number
  stagger?: number
  start?: string
}

export function useScrollAnimation() {
  // Lazy-load GSAP only on client side
  async function animateFadeIn(
    target: string | Element | Ref<Element | null>,
    options: ScrollAnimationOptions = {}
  ) {
    if (!import.meta.client) return

    const { gsap } = await import('gsap')
    const { ScrollTrigger } = await import('gsap/ScrollTrigger')
    gsap.registerPlugin(ScrollTrigger)

    const el = typeof target === 'string' ? target : (target as Ref<Element | null>).value ?? target

    gsap.fromTo(
      el,
      { opacity: 0, y: options.y ?? 32 },
      {
        opacity: 1,
        y: 0,
        duration: options.duration ?? 0.7,
        delay: options.delay ?? 0,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: el as Element,
          start: options.start ?? 'top 85%',
          once: true,
        },
      }
    )
  }

  async function animateStagger(
    targets: string,
    options: ScrollAnimationOptions = {}
  ) {
    if (!import.meta.client) return

    const { gsap } = await import('gsap')
    const { ScrollTrigger } = await import('gsap/ScrollTrigger')
    gsap.registerPlugin(ScrollTrigger)

    gsap.fromTo(
      targets,
      { opacity: 0, y: options.y ?? 40 },
      {
        opacity: 1,
        y: 0,
        duration: options.duration ?? 0.6,
        stagger: options.stagger ?? 0.15,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: targets,
          start: options.start ?? 'top 80%',
          once: true,
        },
      }
    )
  }

  onUnmounted(async () => {
    if (!import.meta.client) return
    const { ScrollTrigger } = await import('gsap/ScrollTrigger')
    ScrollTrigger.getAll().forEach((t) => t.kill())
  })

  return { animateFadeIn, animateStagger }
}
