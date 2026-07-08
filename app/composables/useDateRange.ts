/**
 * useDateRange — Global zaman aralığı composable'ı.
 * Tüm grafik ve analiz sayfaları bu composable'ı kullanarak
 * tutarlı bir filtre state'i paylaşır.
 *
 * Maksimum 14 günlük veri desteklenir.
 */

export interface DateRangeOption {
  value: string
  label: string      // Kısa etiket (buton içi)
  longLabel: string  // Uzun açıklama (badge içi)
  hours: number      // Kaç saat geriye gidileceği
}

export const DATE_RANGE_OPTIONS: DateRangeOption[] = [
  { value: '1h',  label: '1 Saat',  longLabel: 'Son 1 saatten',  hours: 1    },
  { value: '1d',  label: '1 Gün',   longLabel: 'Son 1 günden',   hours: 24   },
  { value: '3d',  label: '3 Gün',   longLabel: 'Son 3 günden',   hours: 72   },
  { value: '7d',  label: '7 Gün',   longLabel: 'Son 7 günden',   hours: 168  },
  { value: '14d', label: '14 Gün',  longLabel: 'Son 14 günden',  hours: 336  }, // MAX
]

export const DEFAULT_RANGE = '14d'

export function useDateRange() {
  const selectedRange = useState<string>('global-date-range', () => DEFAULT_RANGE)

  // Seçilen aralığın option nesnesi
  const currentOption = computed<DateRangeOption>(
    () => DATE_RANGE_OPTIONS.find(o => o.value === selectedRange.value) ?? DATE_RANGE_OPTIONS[DATE_RANGE_OPTIONS.length - 1]
  )

  // Başlangıç timestamp (ms) — şu andan X saat önce
  const startTs = computed<number>(() => {
    const hours = currentOption.value.hours
    // Sunucu tarafında da max 14 gün korunur, ama burada da guarantee edelim
    const clampedHours = Math.min(hours, 336)
    return Date.now() - clampedHours * 60 * 60 * 1000
  })

  // Bitiş timestamp (ms) — şu an
  const endTs = computed<number>(() => Date.now())

  // "Son 7 günden çekiliyor" gibi badge metni
  const rangeLabel = computed<string>(() => currentOption.value.longLabel + ' çekiliyor')

  // Kısa özet etiket (grafik başlığı için)
  const shortLabel = computed<string>(() => currentOption.value.longLabel)

  function setRange(value: string) {
    if (DATE_RANGE_OPTIONS.some(o => o.value === value)) {
      selectedRange.value = value
    }
  }

  return {
    selectedRange,
    currentOption,
    startTs,
    endTs,
    rangeLabel,
    shortLabel,
    setRange,
    options: DATE_RANGE_OPTIONS,
  }
}
