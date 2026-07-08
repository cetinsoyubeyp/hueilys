<script setup lang="ts">
/**
 * help/index.vue — Help Booklet (Yardım Kitapçığı) page.
 * Contains detailed documentation of Hueilys features.
 */

definePageMeta({
  layout:     'dashboard',
  middleware: 'auth',
})

useSeoMeta({
  title:  'Yardım Kitapçığı — Hueilys',
  robots: 'noindex',
})

const activeTab = ref('general')

const features = {
  general: {
    title: 'Genel Tanıtım',
    description: 'Hueilys, e-ticaret mağazanızı yapay zeka gücüyle uçtan uca analiz eden ve marjlarınızı optimize eden akıllı bir yönetim panelidir.',
    items: [
      {
        title: 'Veri Senkronizasyonu',
        desc: 'Trendyol API altyapısı sayesinde siparişleriniz, iadeleriniz ve ürün kataloğunuz gerçek zamanlı olarak sisteme aktarılır. Hiçbir veriyi manuel girmeniz gerekmez.'
      },
      {
        title: 'Kredi Sistemi',
        desc: 'Hueilys gelişmiş yapay zeka analizleri kredi bazlı çalışır. Her analiz türünün (Genel Gelişim, İadeler, Fiyatlandırma) belirli bir kredi maliyeti vardır. Kredilerinizi sağ üstteki panelden takip edebilirsiniz.'
      },
      {
        title: 'Güvenli Kasa (Vault)',
        desc: 'API anahtarlarınız ve şifreleriniz Supabase Vault şifreleme katmanı kullanılarak arka planda pgsodium kriptografisi ile korunur. Veri güvenliğiniz en yüksek seviyededir.'
      }
    ]
  },
  dashboard: {
    title: 'Pano & Performans Grafikleri',
    description: 'Mağazanızın anlık sağlık durumunu, satış ivmesini ve finansal özetlerini izlediğiniz ana kontrol merkezidir.',
    items: [
      {
        title: 'Akıllı KPI Kartları',
        desc: 'Brüt Ciro (iptaller hariç), Teslim Edilen Siparişler, İptal ve İade Oranları ile Ortalama Sepet Değeri (AOV) anlık olarak hesaplanıp gösterilir.'
      },
      {
        title: 'Dinamik Zaman Filtresi',
        desc: '1 Saat, 3 Gün, 7 Gün ve 14 Gün gibi farklı filtreler kullanarak performansınızı karşılaştırabilirsiniz. Tüm grafikler ve veriler bu filtreye göre anlık güncellenir.'
      },
      {
        title: 'İnteraktif Grafikler',
        desc: 'Günlük ciro ve sipariş dağılım grafiklerini inceleyerek en çok satış yaptığınız günleri ve saat dilimlerini kolayca saptayabilirsiniz.'
      }
    ]
  },
  orders: {
    title: 'Sipariş Yönetimi',
    description: 'Trendyol mağazanıza gelen tüm siparişlerin durumunu ve detaylarını tek ekrandan anlık olarak izleyin.',
    items: [
      {
        title: 'Sayfalama & Hızlı Arama',
        desc: 'Siparişleriniz sunucu tarafında hızlıca çekilerek arayüzde yerel sayfalama (client-side pagination) ile listelenir. Sipariş numarası veya alıcı adı ile anında arama yapabilirsiniz.'
      },
      {
        title: 'Kargo & Durum Takibi',
        desc: 'Taşımada olan, teslim edilen, iptal edilen veya yeni oluşturulan siparişler kendilerine özel renkli durum rozetleriyle net olarak gösterilir.'
      },
      {
        title: 'Müşteri Detayları',
        desc: 'Hangi müşterinin hangi ürünü kaç adette aldığını ve kargo durum detaylarını inceleyebilirsiniz.'
      }
    ]
  },
  pricing: {
    title: 'Fiyatlandırma & Kataloğu',
    description: 'Ürünlerinizin Trendyol üzerindeki fiyatlarını, komisyon kesintilerini ve net kâr marjlarını yönetin.',
    items: [
      {
        title: 'Komisyon & Marj Hesaplama',
        desc: 'Trendyol komisyon oranı düşüldükten sonra cebinize girecek net hakediş tutarları her ürün için ayrı ayrı listelenir. Böylece hangi üründen ne kadar kazandığınızı bilirsiniz.'
      },
      {
        title: 'Canlı Fiyat Güncelleme',
        desc: 'Arayüz üzerinden doğrudan ürünün satış fiyatını güncelleyebilir ve Trendyol kataloğunuzda anında aktif olmasını sağlayabilirsiniz.'
      },
      {
        title: 'İndirim Oranları',
        desc: 'Liste fiyatı ile güncel satış fiyatı arasındaki farklar analiz edilerek indirim oranlarınız (%) otomatik listelenir.'
      }
    ]
  },
  recommendations: {
    title: 'YZ Destekli Analiz & Öneriler',
    description: 'Gemini 2.5 Flash yapay zeka modeliyle güçlendirilmiş, mağazanıza özel finansal ve operasyonel aksiyon planları üreten modüldür.',
    items: [
      {
        title: 'İade Analizleri (Returns)',
        desc: 'Müşterilerinizin Trendyol Claims API üzerinden gelen gerçek iade taleplerini, iade nedenlerini (örn: "beden uymadı", "kusurlu ürün") analiz eder. Kargo lojistik maliyetlerinizi hesaplayarak iadeleri %50 düşürmeniz durumunda elde edeceğiniz aylık net tasarrufu formüle eder.'
      },
      {
        title: 'Genel Gelişim Önerileri',
        desc: 'Yorum puanlarınızı, paketleme kalitesini ve AOV artırma taktiklerini analiz eder. Ürün bundle (birlikte satım) stratejileri sunarak ciroyu artırmayı hedefler.'
      },
      {
        title: 'Fiyatlandırma & Rakip Önerileri',
        desc: 'Komisyon yükü yüksek ürünleri, kâr marjı çok düşük kalmış riskli ürünleri tespit eder. Satış hızını artırmak veya Buy-Box rekabetinde öne geçmek için ideal fiyat önerileri sunar.'
      },
      {
        title: 'Etkileşimli Takip Soruları',
        desc: 'Rapor üretildikten sonra YZ Asistanı ile sohbet etmeye devam ederek rapor detayları hakkında (örn: "Akıllı saatin iadelerini azaltmak için kargo paketini nasıl yapmalıyım?") takip soruları sorabilirsiniz.'
      }
    ]
  }
}
</script>

<template>
  <div class="p-6 lg:p-8 space-y-6 max-w-6xl mx-auto flex flex-col min-h-screen">
    
    <!-- Header -->
    <div class="flex flex-col gap-1 flex-shrink-0">
      <h1 class="text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-2.5">
        <span class="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
          </svg>
        </span>
        Yardım Kitapçığı
      </h1>
      <p class="text-sm text-[var(--color-text-muted)] mt-1">
        Hueilys platformunun tüm özelliklerini, yapay zeka analizlerini ve kullanım ipuçlarını keşfedin.
      </p>
    </div>

    <!-- Layout Grid -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
      
      <!-- Left sidebar navigation tabs -->
      <div class="bg-white rounded-2xl border border-[var(--color-border)] p-4 flex flex-col gap-1.5 shadow-2xs">
        <p class="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider px-3 mb-2">Bölümler</p>
        
        <button
          v-for="(data, key) in features"
          :key="key"
          type="button"
          class="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer"
          :class="[
            activeTab === key
              ? 'bg-indigo-50 text-indigo-600'
              : 'text-[var(--color-text-secondary)] hover:bg-slate-50 hover:text-[var(--color-text-primary)]'
          ]"
          @click="activeTab = key"
        >
          {{ data.title }}
        </button>
      </div>

      <!-- Right content display -->
      <div class="md:col-span-3 space-y-6">
        
        <div class="bg-white rounded-3xl border border-[var(--color-border)] p-6 md:p-8 shadow-2xs space-y-6 animate-fadeIn">
          
          <div>
            <h2 class="text-lg font-extrabold text-[var(--color-text-primary)] mb-1">
              {{ features[activeTab].title }}
            </h2>
            <p class="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              {{ features[activeTab].description }}
            </p>
          </div>

          <hr class="border-[var(--color-border)]" />

          <!-- Feature Cards -->
          <div class="space-y-4">
            <div
              v-for="(item, idx) in features[activeTab].items"
              :key="idx"
              class="p-5 rounded-2xl border border-[var(--color-border)] bg-slate-50/30 flex gap-4 items-start hover:border-slate-300 transition-colors"
            >
              <div class="w-6 h-6 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                {{ idx + 1 }}
              </div>
              <div class="space-y-1">
                <h4 class="text-xs font-bold text-[var(--color-text-primary)]">
                  {{ item.title }}
                </h4>
                <p class="text-xs text-[var(--color-text-muted)] leading-relaxed">
                  {{ item.desc }}
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>

  </div>
</template>

<style scoped>
.animate-fadeIn {
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
