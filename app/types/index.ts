/**
 * Application-wide TypeScript type definitions.
 * Add new shared interfaces and types here as the platform grows.
 */

// ─── Navigation ───────────────────────────────────────────────────────────────

export interface NavItem {
  label: string
  href: string
  external?: boolean
}

// ─── Features ─────────────────────────────────────────────────────────────────

export type FeatureIcon = 'analytics' | 'automation' | 'ai'

export interface Feature {
  id: string
  icon: FeatureIcon
  title: string
  description: string
  accentColor: string
}

// ─── Social Links ──────────────────────────────────────────────────────────────

export interface SocialLink {
  label: string
  href: string
  icon: 'github' | 'twitter' | 'linkedin'
}

// ─── Auth Form ────────────────────────────────────────────────────────────────

export interface LoginFormData {
  email: string
  password: string
  rememberMe: boolean
}

export interface RegisterFormData {
  email: string
  password: string
  confirmPassword: string
  fullName: string
}

export type AuthMode = 'login' | 'register'

export interface AuthError {
  message: string
  code?: string
}

// ─── Dashboard Mockup Stats ───────────────────────────────────────────────────

export interface StatCard {
  label: string
  value: string
  change: string
  trend: 'up' | 'down' | 'neutral'
}

// ─── Mouse Position ───────────────────────────────────────────────────────────

export interface MousePosition {
  x: number
  y: number
  normalizedX: number
  normalizedY: number
}

// ─── Marketplace & Store ──────────────────────────────────────────────────────

export type MarketplaceId =
  | 'trendyol'
  | 'amazon'
  | 'hepsiburada'
  | 'n11'
  | 'ebay'
  | 'shopify'

export interface Marketplace {
  id: MarketplaceId
  name: string
  color: string
  bgColor: string
  active: boolean
  fields: StoreField[]
}

export interface StoreField {
  key: string
  label: string
  placeholder: string
  hint?: string
  type?: 'text' | 'password'
}

export interface Store {
  id: string
  user_id: string
  marketplace: MarketplaceId
  store_name: string
  seller_id: string | null
  api_key: string | null
  api_secret: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type AddStoreStep = 'marketplace' | 'credentials' | 'success'

// ─── Trendyol Orders ──────────────────────────────────────────────────────────

export type TrendyolOrderStatus =
  | 'Created'
  | 'Picking'
  | 'Invoiced'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled'
  | 'UnDelivered'
  | 'Returned'
  | 'WaitingForSupply'
  | 'PickupPoint'

export interface TrendyolOrderLine {
  lineId:        number
  productName:   string
  productCode:   number
  barcode:       string
  quantity:      number
  amount:        number
  price:         number
  currencyCode:  string
  merchantSku:   string
  images?:       Array<{ url: string }>
  productSize?:  string
  productColor?: string
}

export interface TrendyolOrder {
  orderId:                   number
  orderNumber:               string
  status:                    TrendyolOrderStatus
  shipmentPackageStatus:     TrendyolOrderStatus
  shipmentAddress: {
    firstName:   string
    lastName:    string
    address1:    string
    city:        string
    district:    string
    postalCode?: string
  }
  invoiceAddress?: {
    firstName: string
    lastName:  string
    company?:  string
  }
  lines:                     TrendyolOrderLine[]
  orderDate:                 number   // Unix ms
  grossAmount:               number
  totalDiscount:             number
  taxNumber?:                string
  deliveredByService:        boolean
  fastDelivery:              boolean
  cargoProviderName?:        string
  cargoTrackingNumber?:      string
  cargoTrackingLink?:        string
  estimatedDeliveryStartDate?: number
  estimatedDeliveryEndDate?:   number
}

export interface TrendyolOrdersResponse {
  totalElements: number
  totalPages:    number
  page:          number
  size:          number
  content:       TrendyolOrder[]
}
