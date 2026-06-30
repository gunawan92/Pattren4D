<script setup>
import { computed } from 'vue'
import CandidateCards from './CandidateCards.vue'
import { asArray, displayDayName, displaySession } from '../utils/format'

const props = defineProps({
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

const result = computed(() => props.analysis?.analysis || props.analysis)
const generated = computed(() => props.analysis?.generated || null)
const topCandidates = computed(() => props.analysis?.topCandidates || props.analysis?.candidates4d || [])
const isPatternLabV2 = computed(() => Boolean(props.analysis?.analysis && props.analysis?.topCandidates))

function entriesOf(value) {
  return Object.entries(value || {}).sort((a, b) => Number(b[1]) - Number(a[1]))
}

function digitEntries(value) {
  return Object.entries(value || {}).sort((a, b) => Number(a[0]) - Number(b[0]))
}

function formatNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value).toLocaleString('id-ID') : '-'
}

function candidateKey(candidate) {
  return candidate?._id || candidate?.candidate || candidate
}

function breakdownText(draw) {
  const rows = draw?.dsv1Breakdown || []
  return rows.length
    ? rows.map((row) => `${row.digit} = ${row.score}`).join(', ')
    : '-'
}

function percent(value) {
  return Number.isFinite(Number(value)) ? `${Math.round(Number(value) * 100)}%` : '-'
}
</script>

<template>
  <section class="card app-card">
    <div class="card-body">
      <div class="d-flex align-items-center justify-content-between gap-3 mb-3">
        <h2 class="section-title mb-0">Hasil Analisa</h2>
        <span v-if="isPatternLabV2" class="badge text-bg-dark">Pattern Lab v2</span>
        <span v-else-if="analysis?.algorithmVersion" class="badge text-bg-dark">
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
            <strong>{{ displaySession(result.session) }}</strong>
          </article>
          <article>
            <span>Tanggal Target</span>
            <strong>{{ result.targetDateText || result.targetDate }}</strong>
          </article>
          <article>
            <span>Hari Target</span>
            <strong>{{ displayDayName(result.targetDay) }}</strong>
          </article>
          <article>
            <span>Depth History</span>
            <strong>{{ result.historyDepth || '-' }}</strong>
          </article>
        </div>

        <template v-if="isPatternLabV2">
          <div v-if="generated" class="info-grid mb-3">
            <article>
              <span>Total Generate</span>
              <strong>{{ formatNumber(generated.total) }}</strong>
            </article>
            <article>
              <span>Accepted</span>
              <strong>{{ formatNumber(generated.accepted) }}</strong>
            </article>
            <article>
              <span>Rejected</span>
              <strong>{{ formatNumber(generated.rejected) }}</strong>
            </article>
            <article>
              <span>Range Skor</span>
              <strong>{{ result.suggestedScoreRange?.min }} - {{ result.suggestedScoreRange?.max }}</strong>
            </article>
          </div>

          <h3 class="mini-title">Statistik Mingguan</h3>
          <div class="row g-3 mb-3">
            <div class="col-md-4 col-xl-2">
              <div class="mini-panel h-100">
                <span class="field-label">Min</span>
                <strong>{{ result.statistics?.min ?? '-' }}</strong>
              </div>
            </div>
            <div class="col-md-4 col-xl-2">
              <div class="mini-panel h-100">
                <span class="field-label">Max</span>
                <strong>{{ result.statistics?.max ?? '-' }}</strong>
              </div>
            </div>
            <div class="col-md-4 col-xl-2">
              <div class="mini-panel h-100">
                <span class="field-label">Average</span>
                <strong>{{ result.statistics?.average ?? '-' }}</strong>
              </div>
            </div>
            <div class="col-md-4 col-xl-2">
              <div class="mini-panel h-100">
                <span class="field-label">Median</span>
                <strong>{{ result.statistics?.median ?? '-' }}</strong>
              </div>
            </div>
            <div class="col-md-4 col-xl-2">
              <div class="mini-panel h-100">
                <span class="field-label">Std Dev</span>
                <strong>{{ result.statistics?.standardDeviation ?? '-' }}</strong>
              </div>
            </div>
            <div class="col-md-4 col-xl-2">
              <div class="mini-panel h-100">
                <span class="field-label">Suggested Range</span>
                <strong>{{ result.suggestedScoreRange?.min }} - {{ result.suggestedScoreRange?.max }}</strong>
              </div>
            </div>
          </div>

          <h3 class="mini-title">Pattern Cluster Analysis</h3>
          <div class="table-responsive mb-3">
            <table class="table table-sm table-bordered align-middle mb-0">
              <thead>
                <tr>
                  <th>Cluster</th>
                  <th>Range</th>
                  <th>Frequency</th>
                  <th>Scores</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="cluster in result.patternAnalysis?.scoreClusters || []"
                  :key="cluster.band"
                >
                  <td><strong>{{ cluster.band }}</strong></td>
                  <td>{{ cluster.min }} - {{ cluster.max }}</td>
                  <td>{{ cluster.count }} / {{ percent(cluster.frequency) }}</td>
                  <td>{{ (cluster.scores || []).join(', ') || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="row g-3 mb-3">
            <div class="col-md-6">
              <div class="mini-panel h-100">
                <span class="field-label">Dominant Cluster</span>
                <strong>{{ result.patternAnalysis?.dominantBand || '-' }}</strong>
              </div>
            </div>
            <div class="col-md-6">
              <div class="mini-panel h-100">
                <span class="field-label">Stable Digits</span>
                <strong>{{ (result.patternAnalysis?.digitTrends?.stableDigits || []).join(', ') || '-' }}</strong>
              </div>
            </div>
          </div>

          <h3 class="mini-title">Current DSV1 Table</h3>
          <div class="table-responsive mb-3">
            <table class="table table-sm table-bordered align-middle mb-0">
              <thead>
                <tr>
                  <th>Digit</th>
                  <th v-for="[digit] in digitEntries(result.currentWeightProfile)" :key="`dsv1-head-${digit}`">
                    {{ digit }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Score</strong></td>
                  <td v-for="[digit, score] in digitEntries(result.currentWeightProfile)" :key="`dsv1-score-${digit}`">
                    {{ score }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 class="mini-title">History Draw</h3>
          <div class="table-responsive">
            <table class="table table-sm table-bordered align-middle mb-0">
              <thead>
                <tr>
                  <th>Offset</th>
                  <th>Tanggal</th>
                  <th>Hari</th>
                  <th>Result</th>
                  <th>DSV1 Breakdown</th>
                  <th>Total Score</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="draw in result.history || []" :key="draw.id || draw.drawDateText">
                  <td>{{ draw.weekOffset }}</td>
                  <td>{{ draw.drawDateText }}</td>
                  <td>{{ displayDayName(draw.dayName) }}</td>
                  <td><strong>{{ draw.result4d || draw.drawNumber }}</strong></td>
                  <td>{{ breakdownText(draw) }}</td>
                  <td><strong>{{ draw.totalScore ?? '-' }}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 class="mini-title mt-3">Top Ranking</h3>
          <CandidateCards :candidates4d="topCandidates" />

          <div class="table-responsive my-3">
            <table class="table table-sm table-bordered align-middle mb-0">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Kandidat</th>
                  <th>Cluster</th>
                  <th>Final</th>
                  <th>DSV1</th>
                  <th>Support</th>
                  <th>History</th>
                  <th>Frequency</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="candidate in topCandidates" :key="candidateKey(candidate)">
                  <td>{{ candidate.rankLabel || candidate.rank || '-' }}</td>
                  <td><strong>{{ candidate.candidate || candidate }}</strong></td>
                  <td>{{ candidate.patternBand || '-' }}</td>
                  <td>{{ candidate.finalScore ?? '-' }}</td>
                  <td>{{ candidate.dsv1Score ?? '-' }}</td>
                  <td>{{ candidate.supportScore ?? '-' }}</td>
                  <td>{{ candidate.historicalWeight ?? '-' }}</td>
                  <td>{{ candidate.frequencyWeight ?? '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>

        <template v-else>
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
      </template>
    </div>
  </section>
</template>
