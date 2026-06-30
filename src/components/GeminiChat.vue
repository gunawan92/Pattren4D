<script setup>
import { computed, ref, watch } from 'vue'
import { analyzeCandidatesWithAi } from '../services/api'

const props = defineProps({
  analysis: {
    type: Object,
    default: null,
  },
})

const loading = ref(false)
const error = ref('')
const aiResult = ref(null)

const analysisForAi = computed(() => {
  if (!props.analysis?.topCandidates) {
    return props.analysis
  }

  return {
    ...(props.analysis.analysis || {}),
    candidates4d: props.analysis.topCandidates.map((candidate) => candidate.candidate),
    topCandidates: props.analysis.topCandidates,
    generated: props.analysis.generated,
  }
})

const canAnalyze = computed(() => {
  return Boolean(analysisForAi.value?.candidates4d?.length)
})

function displayList(value) {
  return Array.isArray(value) ? value : []
}

function candidateLayer(item) {
  return item?.layer || 'unknown'
}

async function runAiAnalysis() {
  if (!canAnalyze.value) {
    return
  }

  loading.value = true
  error.value = ''

  try {
    const response = await analyzeCandidatesWithAi(analysisForAi.value)
    aiResult.value = response.data || null
  } catch (_err) {
    error.value = 'AI analysis failed. Please run generate again or check Gemini API key.'
  } finally {
    loading.value = false
  }
}

watch(
  () => props.analysis?._id || props.analysis?.updatedAt || props.analysis?.targetDateText,
  () => {
    aiResult.value = null
    error.value = ''
  },
)
</script>

<template>
  <section class="card app-card ai-analyst-card">
    <div class="card-body">
      <div class="d-flex align-items-center justify-content-between gap-3 mb-3">
        <div>
          <h2 class="section-title mb-1">AI Analyst</h2>
          <p class="text-secondary mb-0">
            Review signal dari hasil engine deterministic.
          </p>
        </div>
        <button
          class="btn btn-primary"
          type="button"
          :disabled="loading || !canAnalyze"
          @click="runAiAnalysis"
        >
          {{ loading ? 'Menganalisa...' : 'Analisa dengan AI' }}
        </button>
      </div>

      <div v-if="!canAnalyze" class="empty-state py-3">
        Jalankan Generate Analisa dulu untuk mengaktifkan AI Analyst.
      </div>

      <div v-if="error" class="alert alert-danger mb-0">
        {{ error }}
      </div>

      <div v-if="loading" class="empty-state py-3">
        AI sedang membaca kandidat, source, AS kepala/ekor, dan middle 2D...
      </div>

      <template v-if="aiResult && !loading">
        <div class="row g-3 mb-3">
          <div class="col-md-8">
            <div class="mini-panel h-100">
              <span class="field-label">Summary</span>
              <p class="mb-0 mt-2">{{ aiResult.summary || '-' }}</p>
            </div>
          </div>
          <div class="col-md-4">
            <div class="mini-panel h-100">
              <span class="field-label">Confidence</span>
              <div class="d-flex align-items-center gap-2 mt-2">
                <span class="badge text-bg-dark">{{ aiResult.confidence || 'low' }}</span>
                <strong>{{ aiResult.confidence_percent ?? 0 }}%</strong>
              </div>
            </div>
          </div>
          <div class="col-md-8">
            <div class="mini-panel h-100">
              <span class="field-label">Main Reading</span>
              <p class="mb-0 mt-2">{{ aiResult.main_reading || '-' }}</p>
            </div>
          </div>
          <div class="col-md-4">
            <div class="mini-panel h-100">
              <span class="field-label">Source Quality</span>
              <div class="mt-2">
                <span class="badge text-bg-info">{{ aiResult.source_quality?.status || 'weak' }}</span>
                <p class="mb-0 mt-2 small">{{ aiResult.source_quality?.reason || '-' }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="row g-3">
          <div class="col-lg-6">
            <div class="mini-panel h-100">
              <span class="field-label">Candidate Rank</span>
              <div v-if="!displayList(aiResult.candidate_rank).length" class="text-secondary mt-2">-</div>
              <div
                v-for="item in displayList(aiResult.candidate_rank)"
                :key="`rank-${item.rank}-${item.number}`"
                class="ai-list-row"
              >
                <strong>{{ item.rank }}. {{ item.number }}</strong>
                <span class="badge text-bg-light border">{{ candidateLayer(item) }}</span>
                <p class="mb-0 small text-secondary">{{ item.reason }}</p>
              </div>
            </div>
          </div>

          <div class="col-lg-6">
            <div class="mini-panel h-100">
              <span class="field-label">Final POC</span>
              <div class="candidate-strip mt-2">
                <span
                  v-for="number in displayList(aiResult.final_poc)"
                  :key="`poc-${number}`"
                  class="candidate-pill"
                >
                  {{ number }}
                </span>
                <span v-if="!displayList(aiResult.final_poc).length" class="text-secondary">-</span>
              </div>
            </div>
          </div>

          <div class="col-md-6">
            <div class="mini-panel h-100">
              <span class="field-label">Raise Candidates</span>
              <div v-if="!displayList(aiResult.raise_candidates).length" class="text-secondary mt-2">-</div>
              <div
                v-for="item in displayList(aiResult.raise_candidates)"
                :key="`raise-${item.number}`"
                class="ai-list-row compact"
              >
                <strong>{{ item.number }}</strong>
                <p class="mb-0 small text-secondary">{{ item.reason }}</p>
              </div>
            </div>
          </div>

          <div class="col-md-6">
            <div class="mini-panel h-100">
              <span class="field-label">Lower Candidates</span>
              <div v-if="!displayList(aiResult.lower_candidates).length" class="text-secondary mt-2">-</div>
              <div
                v-for="item in displayList(aiResult.lower_candidates)"
                :key="`lower-${item.number}`"
                class="ai-list-row compact"
              >
                <strong>{{ item.number }}</strong>
                <p class="mb-0 small text-secondary">{{ item.reason }}</p>
              </div>
            </div>
          </div>

          <div class="col-md-6">
            <div class="mini-panel h-100">
              <span class="field-label">Warnings</span>
              <ul class="ai-bullet-list mb-0 mt-2">
                <li v-for="warning in displayList(aiResult.warnings)" :key="`warning-${warning}`">
                  {{ warning }}
                </li>
                <li v-if="!displayList(aiResult.warnings).length" class="text-secondary">-</li>
              </ul>
            </div>
          </div>

          <div class="col-md-6">
            <div class="mini-panel h-100">
              <span class="field-label">Debug Notes</span>
              <ul class="ai-bullet-list mb-0 mt-2">
                <li v-for="note in displayList(aiResult.debug_notes)" :key="`debug-${note}`">
                  {{ note }}
                </li>
                <li v-if="!displayList(aiResult.debug_notes).length" class="text-secondary">-</li>
              </ul>
            </div>
          </div>
        </div>
      </template>
    </div>
  </section>
</template>
