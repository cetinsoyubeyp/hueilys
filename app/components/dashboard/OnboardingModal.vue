<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{ close: [] }>()

const currentStep = ref(1)
const totalSteps = 5

function nextStep() {
  if (currentStep.value < totalSteps) {
    currentStep.value++
  }
}

function prevStep() {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

function finish() {
  localStorage.setItem('hueilys-onboarding-completed', 'true')
  emit('close')
}
</script>

<template>
  <div class="onboarding-overlay flex items-center justify-center">
    <div class="onboarding-card">
      
      <!-- Progress Bar Indicator -->
      <div class="onboarding-progress">
        <div 
          v-for="step in totalSteps" 
          :key="step" 
          class="progress-dot"
          :class="{
            'active': step === currentStep,
            'completed': step < currentStep
          }"
        />
      </div>

      <!-- Slide content wrapper -->
      <div class="slide-content-wrapper">
        
        <!-- STEP 1 -->
        <div v-if="currentStep === 1" class="slide-item">
          <div class="slide-icon-wrapper welcome-gradient">
            <svg class="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.59 14.37a6 6 0 01-5.84 0M12 3a9 9 0 019 9v1a3 3 0 01-3 3h-1.5a3 3 0 00-3 3v1a3 3 0 01-3 3H6a3 3 0 01-3-3V12a9 9 0 019-9z"/>
            </svg>
          </div>
          <h2 class="slide-title">Hoş Geldiniz!</h2>
          <p class="slide-text">
            Hueilys (version.0.1) erken erişim programına katıldığınız için teşekkür ederiz!
          </p>
        </div>

        <!-- STEP 2 -->
        <div v-if="currentStep === 2" class="slide-item">
          <div class="slide-icon-wrapper gift-gradient">
            <svg class="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5a2 2 0 10-2 2h2zm0 0h4m-4 0H8m12 3v10a2 2 0 01-2 2H6a2 2 0 01-2-2V11a2 2 0 012-2h12a2 2 0 012 2z"/>
            </svg>
          </div>
          <h2 class="slide-title">Hediye Krediniz</h2>
          <p class="slide-text">
            Hesabınızı aktifleştirmek ve test etmeye başlamak için promosyon kodu:
          </p>
          <div class="code-box">
            <code class="promo-code">hueilys-beta-cc</code>
          </div>
          <p class="slide-text-muted mt-2">
            Bu kodu kullanarak <strong>1000 krediyi</strong> anında hesabınıza tanımlayabilirsiniz.
          </p>
        </div>

        <!-- STEP 3 -->
        <div v-if="currentStep === 3" class="slide-item">
          <div class="slide-icon-wrapper bug-gradient">
            <svg class="w-8 h-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
          </div>
          <h2 class="slide-title">Geliştirme Raporu</h2>
          <p class="slide-text">
            Hueilys henüz geliştirme aşamasında olduğu için bazı teknik sorunlar ile karşılaşabilirsiniz.
          </p>
          <p class="slide-text-muted mt-2">
            Bunları tarafımıza ilettiğiniz müddetçe Hueilys tam sürüme çıktığında işbirliğiniz için teşekkür anlamında hesabınıza <strong>1000 Kredi daha</strong> tanımlanacaktır.
          </p>
        </div>

        <!-- STEP 4 -->
        <div v-if="currentStep === 4" class="slide-item">
          <div class="slide-icon-wrapper help-gradient">
            <svg class="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
            </svg>
          </div>
          <h2 class="slide-title">Yardım Kitapçığı</h2>
          <p class="slide-text">
            Sıkıştığınız noktalarda <strong>Yardım Kitapçığı</strong> bölümünden gerekli bilgilere erişebilirsiniz.
          </p>
        </div>

        <!-- STEP 5 -->
        <div v-if="currentStep === 5" class="slide-item">
          <div class="slide-icon-wrapper success-gradient">
            <svg class="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <h2 class="slide-title">Başarılar Dileriz!</h2>
          <p class="slide-text">
            Hueilys geliştirme ekibi e-ticaret maceranızda size başarılar diler.
          </p>
        </div>

      </div>

      <!-- Navigation buttons -->
      <div class="onboarding-actions">
        <!-- Back button (Hidden on Step 1) -->
        <button
          v-if="currentStep > 1"
          type="button"
          class="btn-onboarding-back"
          @click="prevStep"
        >
          Geri
        </button>
        <div v-else class="flex-1" />

        <!-- Next / Finish button -->
        <button
          v-if="currentStep < totalSteps"
          type="button"
          class="btn-onboarding-next"
          @click="nextStep"
        >
          İleri
        </button>
        <button
          v-else
          type="button"
          class="btn-onboarding-finish"
          @click="finish"
        >
          Başla!
        </button>
      </div>

    </div>
  </div>
</template>

<style scoped>
.onboarding-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(8px);
  z-index: 1000;
  padding: 1rem;
}

.onboarding-card {
  background: white;
  border-radius: 28px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(226, 232, 240, 0.8);
  width: 100%;
  max-width: 440px;
  padding: 2.25rem 2rem;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  animation: scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes scaleUp {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

/* Onboarding progress steps */
.onboarding-progress {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 2rem;
}

.progress-dot {
  width: 24px;
  height: 4px;
  border-radius: 99px;
  background: #E2E8F0;
  transition: all 0.25s ease;
}

.progress-dot.active {
  background: #6366f1;
  width: 36px;
}

.progress-dot.completed {
  background: #a5b4fc;
}

/* Slide Content */
.slide-content-wrapper {
  min-height: 220px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.slide-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  animation: fadeIn 0.25s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.slide-icon-wrapper {
  width: 64px;
  height: 64px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.welcome-gradient {
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.2);
}

.gift-gradient {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.bug-gradient {
  background: rgba(249, 115, 22, 0.1);
  border: 1px solid rgba(249, 115, 22, 0.2);
}

.help-gradient {
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.success-gradient {
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.2);
}

.slide-title {
  font-size: 1.25rem;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 0.75rem;
}

.slide-text {
  font-size: 0.875rem;
  font-weight: 500;
  color: #475569;
  line-height: 1.6;
}

.slide-text-muted {
  font-size: 0.75rem;
  font-weight: 500;
  color: #64748b;
  line-height: 1.5;
}

/* Coupon Box */
.code-box {
  background: #F8FAFC;
  border: 1px dashed rgba(16, 185, 129, 0.4);
  border-radius: 12px;
  padding: 8px 16px;
  margin-top: 0.75rem;
  margin-bottom: 0.5rem;
  display: inline-block;
}

.promo-code {
  font-family: monospace;
  font-size: 1.125rem;
  font-weight: 800;
  color: #059669;
  letter-spacing: 0.5px;
}

/* Onboarding Actions */
.onboarding-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 2rem;
  gap: 12px;
  width: 100%;
}

.btn-onboarding-back {
  flex: 1;
  padding: 10px 16px;
  border-radius: 14px;
  font-size: 0.8125rem;
  font-weight: 700;
  background: #F1F5F9;
  color: #475569;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: center;
}

.btn-onboarding-back:hover {
  background: #E2E8F0;
  color: #0f172a;
}

.btn-onboarding-next,
.btn-onboarding-finish {
  flex: 2;
  padding: 10px 16px;
  border-radius: 14px;
  font-size: 0.8125rem;
  font-weight: 700;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: center;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
}

.btn-onboarding-next {
  background: #6366f1;
  color: white;
}

.btn-onboarding-next:hover {
  background: #4f46e5;
  box-shadow: 0 4px 16px rgba(79, 70, 229, 0.35);
}

.btn-onboarding-finish {
  background: #10B981;
  color: white;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
}

.btn-onboarding-finish:hover {
  background: #059669;
  box-shadow: 0 4px 16px rgba(5, 150, 105, 0.35);
}
</style>
