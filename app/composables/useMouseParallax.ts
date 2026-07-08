/**
 * useMouseParallax — Tracks normalised mouse position for parallax and 3D effects.
 * Returns values in [-1, 1] range, throttled via requestAnimationFrame for performance.
 */

import { ref, onMounted, onUnmounted } from 'vue'
import type { MousePosition } from '~/types'

export function useMouseParallax() {
  const position = ref<MousePosition>({
    x: 0,
    y: 0,
    normalizedX: 0,
    normalizedY: 0,
  })

  let rafId: number | null = null
  let pendingX = 0
  let pendingY = 0

  function onMouseMove(e: MouseEvent) {
    pendingX = e.clientX
    pendingY = e.clientY

    if (rafId !== null) return

    rafId = requestAnimationFrame(() => {
      const normalizedX = (pendingX / window.innerWidth - 0.5) * 2
      const normalizedY = (pendingY / window.innerHeight - 0.5) * 2

      position.value = {
        x: pendingX,
        y: pendingY,
        normalizedX,
        normalizedY,
      }

      rafId = null
    })
  }

  onMounted(() => {
    window.addEventListener('mousemove', onMouseMove, { passive: true })
  })

  onUnmounted(() => {
    window.removeEventListener('mousemove', onMouseMove)
    if (rafId !== null) cancelAnimationFrame(rafId)
  })

  return { position }
}
