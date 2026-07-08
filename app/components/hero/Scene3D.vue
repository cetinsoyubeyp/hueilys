<script setup lang="ts">
/**
 * Scene3D — Three.js wireframe sphere with mouse parallax.
 * Lazy-loaded, disabled on mobile for performance.
 * Uses requestAnimationFrame for smooth, FPS-friendly animation.
 */

import { SCENE_3D, BREAKPOINTS } from '~/constants'
import { useMouseParallax } from '~/composables/useMouseParallax'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const { position: mousePos } = useMouseParallax()
const { width: windowWidth } = useWindowSize()

// Disable on mobile
const isMobile = computed(() => windowWidth.value < BREAKPOINTS.md)

let renderer: import('three').WebGLRenderer | null = null
let animationId: number | null = null

async function initScene() {
  if (!canvasRef.value || isMobile.value) return

  const THREE = await import('three')

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100)
  camera.position.z = SCENE_3D.cameraZ

  renderer = new THREE.WebGLRenderer({
    canvas: canvasRef.value,
    alpha: true,
    antialias: true,
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(520, 520)

  // Wireframe sphere
  const geometry = new THREE.SphereGeometry(
    SCENE_3D.sphereRadius,
    SCENE_3D.sphereWidthSegments,
    SCENE_3D.sphereHeightSegments
  )
  const material = new THREE.MeshBasicMaterial({
    color: 0x2563eb,
    wireframe: true,
    transparent: true,
    opacity: 0.35,
  })
  const sphere = new THREE.Mesh(geometry, material)
  scene.add(sphere)

  // Outer glow ring
  const ringGeo = new THREE.TorusGeometry(2.2, 0.015, 8, 80)
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x60a5fa,
    transparent: true,
    opacity: 0.5,
  })
  const ring = new THREE.Mesh(ringGeo, ringMat)
  ring.rotation.x = Math.PI / 3
  scene.add(ring)

  // Data points (small spheres on the wireframe)
  const pointGeo = new THREE.SphereGeometry(0.045, 6, 6)
  const pointMat = new THREE.MeshBasicMaterial({ color: 0x2563eb })
  const pointCount = 12
  for (let i = 0; i < pointCount; i++) {
    const point = new THREE.Mesh(pointGeo, pointMat)
    const phi = Math.acos(-1 + (2 * i) / pointCount)
    const theta = Math.sqrt(pointCount * Math.PI) * phi
    point.position.setFromSphericalCoords(SCENE_3D.sphereRadius, phi, theta)
    scene.add(point)
  }

  // Animation loop
  const clock = new THREE.Clock()
  function animate() {
    animationId = requestAnimationFrame(animate)
    const elapsed = clock.getElapsedTime()

    // Base rotation
    sphere.rotation.x += SCENE_3D.rotationSpeedX
    sphere.rotation.y += SCENE_3D.rotationSpeedY
    ring.rotation.z += 0.002

    // Mouse parallax
    sphere.rotation.x += mousePos.value.normalizedY * SCENE_3D.mouseInfluence * 0.01
    sphere.rotation.y += mousePos.value.normalizedX * SCENE_3D.mouseInfluence * 0.01

    // Subtle breathing
    const scale = 1 + Math.sin(elapsed * 0.5) * 0.015
    sphere.scale.setScalar(scale)

    renderer!.render(scene, camera)
  }

  animate()
}

function destroyScene() {
  if (animationId !== null) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
  renderer?.dispose()
  renderer = null
}

onMounted(() => {
  if (!isMobile.value) {
    initScene()
  }
})

onUnmounted(destroyScene)

// Re-init if window resizes above mobile breakpoint
watch(isMobile, (newVal) => {
  if (!newVal) {
    initScene()
  } else {
    destroyScene()
  }
})
</script>

<template>
  <div
    style="width: 520px; height: 520px;"
    aria-hidden="true"
    role="presentation"
  >
    <!-- Three.js canvas: exact size, no flex shifting -->
    <canvas
      v-if="!isMobile"
      ref="canvasRef"
      style="
        display: block;
        width: 520px;
        height: 520px;
        filter: drop-shadow(0 0 60px rgba(37,99,235,0.22));
      "
    />
  </div>
</template>
