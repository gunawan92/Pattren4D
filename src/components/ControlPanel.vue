<script setup>
import { computed, reactive, watch } from 'vue'
import { todayInputValue } from '../utils/format'

defineProps({
  syncLoading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['generate', 'refresh-results', 'session-change', 'sync-results'])

const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
const form = reactive({
  session: 'day',
  targetDate: todayInputValue(),
  targetDay: 'Kamis',
  algorithmVersion: 'day_v1',
})

const algorithmOptions = computed(() => {
  return form.session === 'day' ? ['day_v1', 'day_v2'] : ['night_v1', 'night_v2']
})

watch(
  () => form.session,
  (session) => {
    form.algorithmVersion = session === 'day' ? 'day_v1' : 'night_v1'
    emit('session-change', session)
  },
)

function submit() {
  emit('generate', { ...form })
}
</script>

<template>
  <section class="card app-card">
    <div class="card-body">
      <div class="d-flex align-items-center justify-content-between gap-3 mb-3">
        <h2 class="section-title mb-0">Panel Kontrol</h2>
        <span class="badge text-bg-primary">{{ form.session }}</span>
      </div>

      <form class="row g-3" @submit.prevent="submit">
        <div class="col-md-6 col-lg-12">
          <label class="form-label fw-semibold" for="session">Sesi</label>
          <select id="session" v-model="form.session" class="form-select">
            <option value="day">Siang</option>
            <option value="night">Malam</option>
          </select>
        </div>

        <div class="col-md-6 col-lg-12">
          <label class="form-label fw-semibold" for="target-date">Tanggal Target</label>
          <input id="target-date" v-model="form.targetDate" class="form-control" type="date" />
        </div>

        <div class="col-md-6 col-lg-12">
          <label class="form-label fw-semibold" for="target-day">Hari Target</label>
          <select id="target-day" v-model="form.targetDay" class="form-select">
            <option v-for="day in days" :key="day" :value="day">{{ day }}</option>
          </select>
        </div>

        <div class="col-md-6 col-lg-12">
          <label class="form-label fw-semibold" for="algorithm">Versi Algoritma</label>
          <select id="algorithm" v-model="form.algorithmVersion" class="form-select">
            <option v-for="version in algorithmOptions" :key="version" :value="version">
              {{ version }}
            </option>
          </select>
        </div>

        <div class="col-12 d-grid gap-2">
          <button class="btn btn-primary" type="submit">Generate Analisa</button>
          <button class="btn btn-outline-secondary" type="button" @click="emit('refresh-results')">
            Refresh Hasil Terbaru
          </button>
        </div>

        <div class="col-12">
          <div class="sync-actions" aria-label="Sinkronisasi data draw">
            <button
              class="btn btn-outline-primary"
              type="button"
              :disabled="syncLoading"
              @click="emit('sync-results', form.session)"
            >
              {{ syncLoading ? 'Sync...' : `Sync ${form.session === 'day' ? 'Siang' : 'Malam'}` }}
            </button>
            <button
              class="btn btn-outline-primary"
              type="button"
              :disabled="syncLoading"
              @click="emit('sync-results', 'all')"
            >
              Sync All
            </button>
          </div>
        </div>
      </form>
    </div>
  </section>
</template>
