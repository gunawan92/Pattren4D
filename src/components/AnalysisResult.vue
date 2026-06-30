<script setup>
import CandidateCards from './CandidateCards.vue'
import { asArray, displayDayName, displaySession } from '../utils/format'

defineProps({
  analysis: {
    type: Object,
    default: null,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
    default: '',
  },
})

function entriesOf(value) {
  return Object.entries(value || {}).sort((a, b) => Number(b[1]) - Number(a[1]))
}
</script>

<template>
  <section class="card app-card">
    <div class="card-body">
      <div class="d-flex align-items-center justify-content-between gap-3 mb-3">
        <h2 class="section-title mb-0">Hasil Analisa</h2>
        <span v-if="analysis?.algorithmVersion" class="badge text-bg-dark">
          {{ analysis.algorithmVersion }}
        </span>
      </div>

      <div v-if="error" class="alert alert-danger">{{ error }}</div>
      <div v-if="loading" class="empty-state">Membuat analisa...</div>
      <div v-else-if="!analysis" class="empty-state">
        Belum ada analisa. Pilih sesi, tanggal, hari, lalu klik Generate Analisa.
      </div>

      <template v-else>
        <div class="info-grid mb-3">
          <article>
            <span>Sesi</span>
            <strong>{{ displaySession(analysis.session) }}</strong>
          </article>
          <article>
            <span>Tanggal Target</span>
            <strong>{{ analysis.targetDateText || analysis.targetDate }}</strong>
          </article>
          <article>
            <span>Hari Target</span>
            <strong>{{ displayDayName(analysis.targetDay) }}</strong>
          </article>
          <article>
            <span>Algoritma</span>
            <strong>{{ analysis.algorithmVersion }}</strong>
          </article>
        </div>

        <h3 class="mini-title">Input Acuan</h3>
        <div class="row g-3 mb-3">
          <div
            v-for="item in [
              ['previousDayResult', analysis.input?.previousDayResult],
              ['sameDayLastWeekResult', analysis.input?.sameDayLastWeekResult],
              ['sameDayTwoWeeksAgoResult', analysis.input?.sameDayTwoWeeksAgoResult],
              ['previousDayMistikLama', analysis.input?.previousDayMistikLama],
              ['previousDayMistikBaru', analysis.input?.previousDayMistikBaru],
              ['sameDayLastWeekMistikLama', analysis.input?.sameDayLastWeekMistikLama],
              ['sameDayLastWeekMistikBaru', analysis.input?.sameDayLastWeekMistikBaru],
              ['selectedMainSource', analysis.input?.selectedMainSource],
              ['selectedSupportSource', analysis.input?.selectedSupportSource],
            ]"
            :key="item[0]"
            class="col-md-4 col-xl-3"
          >
            <div class="mini-panel h-100">
              <span class="field-label">{{ item[0] }}</span>
              <strong>{{ item[1] || '-' }}</strong>
            </div>
          </div>
          <div class="col-md-6">
            <div class="mini-panel h-100">
              <span class="field-label">activeMistikSource</span>
              <div class="badge-list mt-2">
                <span
                  v-for="source in asArray(analysis.input?.activeMistikSource)"
                  :key="`active-${source}`"
                  class="badge text-bg-info"
                >
                  {{ source }}
                </span>
                <strong v-if="!asArray(analysis.input?.activeMistikSource).length">-</strong>
              </div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="mini-panel h-100">
              <span class="field-label">dominantDigits</span>
              <div class="mt-2">
                <span
                  v-for="digit in asArray(analysis.input?.dominantDigits)"
                  :key="`dominant-${digit}`"
                  class="digit-ball reserve"
                >
                  {{ digit }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <h3 class="mini-title">Digit Pool</h3>
        <div class="row g-3 mb-3">
          <div class="col-md-4">
            <div class="mini-panel h-100">
              <span class="field-label">utama</span>
              <div class="mt-2">
                <span
                  v-for="digit in analysis.digitPool?.main || []"
                  :key="`main-${digit}`"
                  class="digit-ball"
                >
                  {{ digit }}
                </span>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="mini-panel h-100">
              <span class="field-label">pendukung</span>
              <div class="mt-2">
                <span
                  v-for="digit in analysis.digitPool?.support || []"
                  :key="`support-${digit}`"
                  class="digit-ball support"
                >
                  {{ digit }}
                </span>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="mini-panel h-100">
              <span class="field-label">cadangan</span>
              <div class="mt-2">
                <span
                  v-for="digit in analysis.digitPool?.reserve || []"
                  :key="`reserve-${digit}`"
                  class="digit-ball reserve"
                >
                  {{ digit }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="table-responsive mb-3">
          <table class="table table-sm table-bordered align-middle mb-0">
            <thead>
              <tr>
                <th>Digit</th>
                <th>Skor</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="[digit, score] in entriesOf(analysis.digitPool?.weighted)" :key="digit">
                <td><span class="digit-ball compact">{{ digit }}</span></td>
                <td><strong>{{ score }}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>

        <CandidateCards
          :front2d="analysis.front2d || []"
          :back2d="analysis.back2d || []"
          :candidates4d="analysis.candidates4d || []"
        />
      </template>
    </div>
  </section>
</template>
