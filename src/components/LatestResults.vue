<script setup>
import { displayDayName, displaySession } from '../utils/format'

defineProps({
  results: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  session: {
    type: String,
    default: 'day',
  },
})
</script>

<template>
  <section class="card app-card h-100">
    <div class="card-body">
      <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <h2 class="section-title mb-0">Hasil Terbaru</h2>
        <span class="badge text-bg-secondary">{{ displaySession(session) }}</span>
      </div>

      <div v-if="loading" class="empty-state">Memuat hasil terbaru...</div>
      <div v-else-if="!results.length" class="empty-state">
        Belum ada data result. Jalankan sync backend dulu.
      </div>
      <div v-else class="table-responsive latest-results-scroll">
        <table class="table align-middle mb-0">
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Hari</th>
              <th>Event / Draw</th>
              <th>Hasil 4D</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="result in results" :key="result._id">
              <td>{{ result.drawDateText || result.drawDate }}</td>
              <td>{{ displayDayName(result.dayName) }}</td>
              <td>{{ result.eventName || result.drawNumber || '-' }}</td>
              <td>
                <span class="badge result-badge">{{ result.result4d || '-' }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>
