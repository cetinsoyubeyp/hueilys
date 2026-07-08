/**
 * Application-wide constants.
 * Centralises all magic values to keep components clean and maintainable.
 */

import type { NavItem, Feature, SocialLink } from '~/types'

// ─── Brand ────────────────────────────────────────────────────────────────────

export const APP_NAME = 'Hueilys' as const
export const APP_TAGLINE = 'E-Ticaret Analitik & Yönetim Platformu' as const

// ─── Colors ───────────────────────────────────────────────────────────────────

export const COLORS = {
  primary: '#2563EB',
  primaryLight: '#60A5FA',
  primaryLighter: '#DBEAFE',
  primaryLightest: '#EFF6FF',
  white: '#FFFFFF',
} as const

// ─── Navigation ───────────────────────────────────────────────────────────────

export const NAV_ITEMS: NavItem[] = [
  { label: 'Ana Sayfa', href: '#home' },
  { label: 'Özellikler', href: '#features' },
  { label: 'Fiyatlandırma', href: '#pricing' },
  { label: 'Hakkımızda', href: '#about' },
]

// ─── Features ─────────────────────────────────────────────────────────────────

export const FEATURES: Feature[] = [
  {
    id: 'analytics',
    icon: 'analytics',
    title: 'Derin Analitik',
    description:
      'Tüm pazaryerlerinizdeki geliri, siparişleri ve müşteri davranışlarını gerçek zamanlı olarak güzel ve işlevsel panolarla takip edin.',
    accentColor: '#2563EB',
  },
  {
    id: 'automation',
    icon: 'automation',
    title: 'Akıllı Otomasyon',
    description:
      'Fiyatlandırma kurallarını, stok uyarılarını ve sipariş iş akışlarını otomatikleştirin. Tekrarlayan görevleri platforma bırakın, siz büyümeye odaklanın.',
    accentColor: '#7C3AED',
  },
  {
    id: 'ai',
    icon: 'ai',
    title: 'Yapay Zeka Önerileri',
    description:
      'Mağazanıza özel yapay zeka destekli ürün önerileri, talep tahmini ve kâr optimizasyon önerileri alın.',
    accentColor: '#0891B2',
  },
]

// ─── Social Links ──────────────────────────────────────────────────────────────

export const SOCIAL_LINKS: SocialLink[] = [
  { label: 'GitHub', href: 'https://github.com', icon: 'github' },
]

// ─── Footer Links ─────────────────────────────────────────────────────────────

export const FOOTER_LINKS = [
  { label: 'Gizlilik Politikası', href: '/privacy' },
  { label: 'Kullanım Şartları', href: '/terms' },
] as const

// ─── Animation Durations (ms) ─────────────────────────────────────────────────

export const ANIMATION = {
  fast: 0.2,
  normal: 0.4,
  slow: 0.8,
  staggerDelay: 0.12,
} as const

// ─── Breakpoints (px) ─────────────────────────────────────────────────────────

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const

// ─── 3D Scene ─────────────────────────────────────────────────────────────────

export const SCENE_3D = {
  sphereRadius: 1.8,
  sphereWidthSegments: 32,
  sphereHeightSegments: 32,
  rotationSpeedX: 0.0008,
  rotationSpeedY: 0.0015,
  mouseInfluence: 0.3,
  cameraZ: 5,
} as const
