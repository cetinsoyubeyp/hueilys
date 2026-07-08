# TASK.md — Hueilys E-Commerce Analytics & Management Platform

---

## Project Vision

E-ticaret satıcılarının bütün operasyonlarını tek panelden yönetebildiği modern bir SaaS platformu.

Satış analizleri, sipariş yönetimi, stok kontrolü, reklam analizleri ve AI destekli öneriler —
hepsini tek, güzel ve hızlı bir dashboard'dan.

---

## Tech Stack

| Katman        | Teknoloji                                     |
|---------------|-----------------------------------------------|
| Framework     | Nuxt 4 + Vue 3 (Composition API)             |
| Language      | TypeScript (strict mode)                      |
| Styling       | TailwindCSS v4 (@tailwindcss/vite)            |
| State         | Pinia (ileride — şu an store yok)             |
| Utils         | VueUse (useWindowScroll, useWindowSize, etc.) |
| 3D            | Three.js (wireframe sphere, RAF-optimised)    |
| Animation     | GSAP + ScrollTrigger (lazy-loaded)            |
| Lint/Format   | ESLint (@nuxt/eslint) + Prettier              |
| Deploy        | Vercel                                        |
| Auth/DB       | Supabase (ileride)                            |

---

## Folder Structure

```
Hueilys/
├── app/
│   ├── assets/
│   │   └── css/
│   │       └── main.css           ← Design system, CSS tokens
│   ├── components/
│   │   ├── features/
│   │   │   └── FeatureCard.vue    ← Tek feature kartı
│   │   ├── hero/
│   │   │   ├── HeroContent.vue    ← Sol taraf: başlık, CTA
│   │   │   ├── LoginCard.vue      ← Sağ taraf: login formu
│   │   │   └── Scene3D.vue        ← Three.js 3D sphere
│   │   ├── layout/
│   │   │   ├── TheNavbar.vue      ← Sticky navbar + blur
│   │   │   └── TheFooter.vue      ← Footer
│   │   ├── preview/
│   │   │   └── DashboardMockup.vue ← Dashboard mockup
│   │   ├── sections/
│   │   │   ├── HeroSection.vue    ← Hero (3D + LoginCard)
│   │   │   ├── FeaturesSection.vue ← 3 feature kartı
│   │   │   └── PlatformPreview.vue ← Dashboard preview
│   │   └── ui/
│   │       └── BaseButton.vue     ← Reusable button
│   ├── composables/
│   │   ├── useMouseParallax.ts    ← Mouse tracking (RAF)
│   │   └── useScrollAnimation.ts ← GSAP ScrollTrigger wrapper
│   ├── constants/
│   │   └── index.ts               ← Tüm sabitler (renk, nav, features)
│   ├── layouts/
│   │   └── default.vue            ← Default layout
│   ├── pages/
│   │   └── index.vue              ← Landing page + SEO
│   └── types/
│       └── index.ts               ← Global TypeScript tipleri
├── public/
│   └── favicon.svg                ← SVG favicon
├── eslint.config.mjs              ← ESLint flat config
├── nuxt.config.ts                 ← Nuxt 4 config
├── package.json                   ← Bağımlılıklar
├── .prettierrc.json               ← Prettier config
└── tsconfig.json                  ← TypeScript config
```

---

## Completed ✅

### Phase 12 — Fiyatlandırma & Kâr Analizi
- [x] `server/api/trendyol/products.get.ts` [NEW] — Ürün listesini çeken API proxy'si (hata durumunda görsel mock veri desteğiyle)
- [x] `app/composables/useProducts.ts` [NEW] — Ürün filtreleme ve durum takibi composable'ı
- [x] `app/pages/dashboard/pricing/index.vue` [NEW] — Fiyatlandırma kontrol ve kâr analizi sayfası
  - KPI Kartları: Ortalama Satış Fiyatı, Ortalama Komisyon Oranı, Ortalama Net Hakediş
  - Analiz & Grafikler Sekmesi: Kâr marjına göre en yüksek getirili 5 ürün (yatay çubuklar), Fiyat Dağılım Grafiği (custom SVG Bar grafiği)
  - Ürün Fiyat Listesi Sekmesi: Ürün listesi tablosu (görsel, barkod, SKU, liste fiyatı, satış fiyatı, komisyon, net hakediş ve düzenleme aksiyonu)
  - Fiyat Düzenleme Modalı: Anlık komisyon ve hakediş hesaplama özellikli popup penceresi
- [x] `app/layouts/dashboard.vue` — Fiyatlandırma sekmesi aktifleştirildi

### Phase 11 — Sipariş Analizleri & Grafikler
- [x] `app/components/orders/OrdersAnalytics.vue` — Grafik ve analiz panosu
  - Son 14 günlük siparişlerin analizi
  - Temel Metrikler: Toplam Gelir, Sipariş Sayısı, Satılan Ürün Adedi, Uygulanan Toplam İndirim
  - Günlük Ciro & AOV (Ortalama Sepet Tutarı) Trendi: Toggle butonlu, interaktif ve kılavuz çizgili custom SVG grafik
  - Saatlik Sipariş Yoğunluğu (24s Dairesel Kadran Grafiği): Fütüristik radar alanı, 24 saatlik kılavuz çizgileri ve trigonometrik açı takibi (Math.atan2) ile çalışan interaktif dairesel yoğunluk haritası (hover ile parlayan kılavuz çizgiler ve merkez tooltip)
  - En Çok Satan Ürünler: Satış adedine ve elde edilen ciroya göre dinamik çubuk grafiklerle en popüler 5 ürünün gösterimi
  - Sipariş Durum Dağılımı: Dinamik ilerleme çubukları ile durum analizi
- [x] `app/pages/dashboard/orders/index.vue` — Tab yapısına geçirildi
  - "Analiz & Grafikler" varsayılan görünüm yapıldı
  - "Sipariş Listesi" sekmesine filtreler ve tablo taşındı
  - Grafik doğruluğu için varsayılan sipariş çekme boyutu (`size`) 100 yapıldı
- [x] `app/components/orders/OrdersTable.vue` — Sipariş detay anahtarı benzersizleştirildi (birlikte açılma hatası çözüldü)

### Phase 10 — Dashboard & Mağaza Yönetimi
- [x] `app/layouts/dashboard.vue` — Sidebar layout (nav, user, çıkış)
- [x] `app/components/dashboard/DashboardNavIcon.vue` — SVG icon renderer
- [x] `app/components/dashboard/EmptyState.vue` — Mağaza yokken boş ekran
- [x] `app/components/dashboard/AddStoreModal.vue` — Çok adımlı modal:
  - Adım 1: Pazaryeri seçimi (Trendyol aktif, diğerleri "Yakında")
  - Adım 2: API bilgileri formu (Mağaza Adı, Satıcı ID, API Key, API Secret)
  - Adım 3: Başarı ekranı
- [x] `app/pages/dashboard/index.vue` — Auth korumalı pano sayfası
  - Supabase'den mağazalar çekilir
  - Mağaza yoksa EmptyState gösterilir
  - Mağaza varsa kart listesi gösterilir
- [x] `supabase/stores.sql` — Stores tablosu SQL + RLS
- [x] `app/types/index.ts` — Marketplace, Store, StoreField, AddStoreStep tipleri
- [x] Login sonrası `/dashboard`'a yönlendirme

### Phase 9 — UX Improvements
- [x] `LoginSuccessAnimation.vue` — SVG daire animasyonu (gri → yeşil, 3 saniye)
  - `stroke-dashoffset` ile dairesel dolum animasyonu
  - 1.2s gecikme sonrası tik işareti çizim animasyonu
  - Giriş başarılı olunca form gizlenir, animasyon gösterilir
  - 3 saniye sonra otomatik yönlendirme
- [x] 3D model hero section'dan kaldırıldı

### Phase 8 — Supabase Auth Integration
- [x] `.env` + `.env.example` oluşturuldu (`SUPABASE_URL`, `SUPABASE_KEY`)
- [x] `@nuxtjs/supabase` paketi kuruldu ve `nuxt.config.ts`'e eklendi
- [x] `supabase.redirectOptions` — login, callback, exclude rotaları tanımlandı
- [x] `app/composables/useAuth.ts` — tam auth composable
  - `signInWithEmail` — email/şifre girişi
  - `signUpWithEmail` — kayıt (fullName + email + password)
  - `signInWithGoogle` — Google OAuth
  - `signInWithGitHub` — GitHub OAuth
  - `signOut` — oturumu kapat
  - `mapAuthError` — kullanıcı dostu hata mesajları
- [x] `app/types/index.ts` — `RegisterFormData`, `AuthMode`, `AuthError` tipleri eklendi
- [x] `app/components/hero/LoginCard.vue` — Supabase bağlı, tam özellikli:
  - Login / Register tab sistemi (animasyonlu geçiş)
  - Email + şifre girişi (gerçek auth)
  - Şifre göster/gizle toggle
  - Şifre güç göstergesi (register'da)
  - Şifre eşleşme doğrulaması (register'da)
  - Kayıt başarı ekranı (email doğrulama bilgisi)
  - Google OAuth butonu (gerçek redirect)
  - GitHub OAuth butonu (gerçek redirect)
  - Hata banner'ı (dismiss edilebilir)
- [x] `app/pages/confirm.vue` — OAuth/email callback sayfası
- [x] `app/middleware/auth.ts` — korumalı sayfalar için auth guard

## In Progress 🔄

- [ ] Supabase Dashboard'da SQL sorgularının çalıştırılması
- [ ] OAuth provider'larının (Google, GitHub) Supabase'de etkinleştirilmesi
- [ ] `.env` dosyasına gerçek `SUPABASE_URL` ve `SUPABASE_KEY` girilmesi

### Phase 1 — Project Scaffolding
- [x] Nuxt 4 projesi oluşturuldu (`npx nuxi@latest init`)
- [x] `package.json` — tüm bağımlılıklar tanımlandı
- [x] `npm install` — 827 paket kuruldu
- [x] `eslint.config.mjs` — ESLint flat config
- [x] `.prettierrc.json` — Prettier config
- [x] `nuxt.config.ts` — Modüller, SEO head, TailwindCSS v4 vite plugin

### Phase 2 — Design System
- [x] `app/assets/css/main.css` — Tam design system
  - CSS custom properties (renk, shadow, radius, transition)
  - Typography scale (text-display, text-headline, text-title)
  - Glass card, surface card utility sınıfları
  - Button variants (primary, ghost, outline)
  - Form input stili
  - Floating, pulse-glow animasyonları
  - Mouse light efekti
  - Container, section-padding utilities
- [x] `app/constants/index.ts` — Tüm magic değerler merkezi sabit
- [x] `app/types/index.ts` — Global TypeScript interfaces
- [x] `public/favicon.svg` — SVG favicon

### Phase 3 — Layout & Core Components
- [x] `app/layouts/default.vue` — Default layout
- [x] `app/components/layout/TheNavbar.vue` — Sticky, blur on scroll, mobile drawer
- [x] `app/components/layout/TheFooter.vue` — Logo, copyright, links
- [x] `app/components/ui/BaseButton.vue` — Reusable button (primary/ghost/outline)
- [x] `app/composables/useMouseParallax.ts` — RAF-throttled mouse tracker
- [x] `app/composables/useScrollAnimation.ts` — GSAP ScrollTrigger wrapper

### Phase 4 — Hero Section
- [x] `app/components/hero/Scene3D.vue` — Three.js wireframe sphere, mouse parallax, mobile-off
- [x] `app/components/hero/LoginCard.vue` — Glass login card (UI-only, no backend)
- [x] `app/components/hero/HeroContent.vue` — GSAP stagger animate, badge, CTA, social proof
- [x] `app/components/sections/HeroSection.vue` — Mouse light, dot grid, sections bileşimi

### Phase 5 — Features Section
- [x] `app/components/features/FeatureCard.vue` — Icon, title, desc, hover CTA
- [x] `app/components/sections/FeaturesSection.vue` — 3 kart grid, scroll animate

### Phase 6 — Platform Preview
- [x] `app/components/preview/DashboardMockup.vue` — Browser chrome, sidebar, stat cards, SVG charts
- [x] `app/components/sections/PlatformPreview.vue` — Scale-in scroll animation, bottom CTA

### Phase 7 — SEO & Final Assembly
- [x] `app/pages/index.vue` — useSeoMeta, OG, Twitter, JSON-LD
- [x] `app/app.vue` — NuxtLayout + NuxtPage
- [x] Dev server başlatıldı — hatasız çalışıyor

### Bug Fixes
- [x] **Component resolution fix** — `nuxt.config.ts`'e `pathPrefix: false` eklendi
  - Sorun: Nuxt 4'te alt klasördeki component'ler otomatik prefix alıyordu
  - `components/layout/TheNavbar.vue` → `<LayoutTheNavbar />` (yanlış)
  - Fix: `pathPrefix: false` → tüm component'ler dosya adıyla çağrılır
- [x] `HeroSection.vue` layout düzeltildi — 3D scene ve LoginCard düzgün stack yapıyor
- [x] `nuxt prepare` çalıştırıldı — `.nuxt/` type dosyaları yenilendi

 ✅

---

## In Progress 🔄

- [ ] Canlı test ve görsel doğrulama

---

## Next Tasks 📋

- [ ] Supabase Auth entegrasyonu (Dashboard sayfası yapıldığında)
- [ ] Dashboard sayfası
- [ ] Pricing sayfası
- [ ] Çoklu marketplace entegrasyonları (Amazon, eBay, Trendyol vb.)
- [ ] Pinia store kurulumu (auth store, user store)
- [ ] Sipariş yönetimi modülü
- [ ] Ürün & Stok yönetimi modülü
- [ ] Reklam analizleri modülü
- [ ] Müşteri analizleri modülü
- [ ] AI Insights sayfası
- [ ] Bildirim sistemi
- [ ] Takım yönetimi
- [ ] Raporlama & Export

---

## Ideas 💡

- Dark mode toggle (CSS custom properties zaten hazır)
- Animasyonlu rakam sayacı (stat kartları için)
- Marketplace logo carousel (Amazon, eBay, Trendyol, Hepsiburada, Shopify vb.)
- Video demo modal (Watch Demo butonu için)
- Pricing bölümü (aylık/yıllık toggle)
- Testimonials / müşteri yorumları bölümü
- Blog / changelog sayfası
- Çok dilli destek (i18n)
- E-posta ile erken erişim kayıt formu

---

## Notes 📝

### TailwindCSS v4
- `@tailwindcss/vite` vite plugin olarak entegre edildi
- `@import "tailwindcss"` direktifi `main.css` içinde
- Ayrıca tailwind.config.ts dosyasına gerek yok (v4 auto-detection)

### Pinia Nuxt Module
- `@pinia/nuxt` modülü Nuxt 4 ile uyumsuz (^3.15.0 gerekiyor)
- Pinia ileride store gerektiğinde doğrudan `pinia` paketi kullanılacak
- `createPinia` Nuxt plugin ile manuel configure edilecek

### Three.js / 3D
- `ClientOnly` wrapper ile SSR'da devre dışı
- `useWindowSize` ile mobile breakpoint altında canvas render edilmiyor
- `requestAnimationFrame` manuel yönetimi ile performans korunuyor
- `onUnmounted` hook'ta renderer ve animasyon frame temizleniyor

### GSAP
- Dynamic import ile lazy-loaded (sadece client-side)
- ScrollTrigger `once: true` ile her element sadece bir kez animate oluyor
- `onUnmounted` hook'ta tüm ScrollTrigger instance'ları temizleniyor

### Performance
- Three.js: `devicePixelRatio` max 2 olarak sınırlandırıldı
- GSAP: lazy import ile initial bundle'a dahil değil
- Fonts: `display=swap` ile FOUT önlendi
