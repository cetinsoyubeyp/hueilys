/**
 * useCredits — Global kredi sistemi composable'ı.
 * Bakiyeyi Supabase 'profiles' tablosunda tutar ve RPC fonksiyonları ile güvenli senkronize eder.
 * Tüm sayfalarda tek bir global state paylaşılır.
 */

export const CREDIT_COSTS = {
  // AI Analiz
  ai_returns:  10,
  ai_general:  15,
  ai_pricing:  10,

  // Fiyatlandırma
  bulk_update:   30,
  single_edit:    0.5,
  group_update:  10,
} as const

export type CreditAction = keyof typeof CREDIT_COSTS

const STORAGE_KEY = 'hueilys_credits'
const DEFAULT_BALANCE = 100 // Başlangıç kredisi

export function useCredits() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  // Global state — tüm component'ler aynı ref'i paylaşır
  const balance = useState<number>('credit-balance', () => DEFAULT_BALANCE)
  const isSyncing = useState<boolean>('credit-syncing', () => false)

  // ─── Veritabanı Senkronizasyonu (Fetch) ──────────────────────────────────
  async function fetchCredits() {
    if (!user.value) return
    isSyncing.value = true

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.value.id)
        .single()

      if (error) throw error

      if (data && typeof data.credits === 'number') {
        balance.value = data.credits
        localStorage.setItem(STORAGE_KEY, String(data.credits))
      }
    } catch (e: any) {
      console.warn('[Credits Sync] DB read failed. Using localStorage fallback:', e.message)
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored !== null) {
        balance.value = parseFloat(stored)
      }
    } finally {
      isSyncing.value = false
    }
  }

  // Kullanıcı değiştiğinde veya giriş yaptığında kredileri çek
  if (import.meta.client) {
    watch(user, (u) => {
      if (u) {
        fetchCredits()
      } else {
        balance.value = DEFAULT_BALANCE
      }
    }, { immediate: true })
  }

  /** Yeterli kredi var mı? */
  function canAfford(action: CreditAction): boolean {
    return balance.value >= CREDIT_COSTS[action]
  }

  /**
   * Krediyi düş (Güvenli RPC üzerinden).
   * Sunucu tarafındaki işlemler zaten API endpoint'inde düşmektedir, 
   * bu fonksiyon sadece istemci tarafında manuel bakiye düşürme gerektiren test/demo durumları içindir.
   * @returns true → başarılı, false → yetersiz kredi
   */
  async function spend(action: CreditAction): Promise<boolean> {
    const cost = CREDIT_COSTS[action]
    if (balance.value < cost) return false

    try {
      const { data, error } = await supabase.rpc('spend_credits', { cost })
      if (error) throw error

      if (data === true) {
        await fetchCredits()
        return true
      }
      return false
    } catch (e: any) {
      console.warn('[Credits spend] RPC failed, updating locally:', e.message)
      const nextBalance = Math.round((balance.value - cost) * 100) / 100
      balance.value = nextBalance
      localStorage.setItem(STORAGE_KEY, String(nextBalance))
      return true
    }
  }

  /** Kredi ekle (Güvenli RPC üzerinden) */
  async function addCredits(amount: number) {
    try {
      const { data, error } = await supabase.rpc('add_credits', { amount })
      if (error) throw error
      if (data !== null) {
        balance.value = Number(data)
        localStorage.setItem(STORAGE_KEY, String(data))
      }
    } catch (e: any) {
      console.warn('[Credits add] RPC failed, updating locally:', e.message)
      const nextBalance = Math.round((balance.value + amount) * 100) / 100
      balance.value = nextBalance
      localStorage.setItem(STORAGE_KEY, String(nextBalance))
    }
  }

  /** Bakiye gösterimi için biçimlendirilmiş string */
  const formattedBalance = computed(() =>
    Number.isInteger(balance.value)
      ? balance.value.toString()
      : balance.value.toFixed(1)
  )

  return {
    balance,
    formattedBalance,
    isSyncing,
    canAfford,
    spend,
    addCredits,
    fetchCredits,
    CREDIT_COSTS,
  }
}
