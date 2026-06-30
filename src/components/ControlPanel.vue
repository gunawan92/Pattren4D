<script setup>
import { reactive, watch } from 'vue'
import { todayInputValue } from '../utils/format'

defineProps({
  syncLoading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['generate', 'refresh-results', 'session-change', 'sync-results'])

const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
const dateFormatter = new Intl.DateTimeFormat('id-ID', { weekday: 'long' })

function dayNameFromInput(value) {
  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const day = dateFormatter.format(date)
  return day.charAt(0).toUpperCase() + day.slice(1)
}

const form = reactive({
  session: 'day',
  targetDate: todayInputValue(),
  targetDay: dayNameFromInput(todayInputValue()),
  historyDepth: 5,
})

watch(
  () => form.session,
  (session) => {
    emit('session-change', session)
  },
)

watch(
  () => form.targetDate,
  (targetDate) => {
    const nextDay = dayNameFromInput(targetDate)
    if (nextDay) {
      form.targetDay = nextDay
    }
  },
)

function submit() {
  emit('generate', {
    ...form,
    historyDepth: Number(form.historyDepth) || 5,
  })
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
          <label class="form-label fw-semibold" for="history-depth">Depth History Mingguan</label>
          <input
            id="history-depth"
            v-model.number="form.historyDepth"
            class="form-control"
            type="number"
            min="1"
            max="52"
          />
        </div>

        <div class="col-12 d-grid gap-2">
          <button class="btn btn-primary" type="submit">Run Pattern Lab v2</button>
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
