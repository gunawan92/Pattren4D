<script setup>
import { onMounted, ref } from 'vue'
import AnalysisResult from './components/AnalysisResult.vue'
import AppHeader from './components/AppHeader.vue'
import ControlPanel from './components/ControlPanel.vue'
import EvaluationPanel from './components/EvaluationPanel.vue'
import LatestResults from './components/LatestResults.vue'
import MistikChecker from './components/MistikChecker.vue'
import { generateAnalysis, getLatestResults, syncDrawResults } from './services/api'
import GeminiChat from './components/GeminiChat.vue'


const session = ref('day')
const latestResults = ref([])
const latestLoading = ref(false)
const latestError = ref('')
const analysis = ref(null)
const analysisLoading = ref(false)
const analysisError = ref('')
const syncLoading = ref(false)
const syncStatus = ref('')
const syncError = ref('')
const evaluation = ref(null)
const evaluationLoading = ref(false)
const evaluationError = ref('')
const currentPayload = ref({
  session: 'day',
  targetDate: '',
  targetDay: '',
  algorithmVersion: '',
})

async function loadLatestResults(nextSession = session.value) {
  latestLoading.value = true
  latestError.value = ''

  try {
    const response = await getLatestResults(nextSession, 200)
    latestResults.value = response.data || []
  } catch (error) {
    latestError.value = error.message
    latestResults.value = []
  } finally {
    latestLoading.value = false
  }
}

async function handleGenerate(payload) {
  currentPayload.value = { ...payload }
  session.value = payload.session
  analysisLoading.value = true
  analysisError.value = ''
  evaluation.value = null
  evaluationError.value = ''

  try {
    const response = await generateAnalysis(payload)
    analysis.value = response.data || response
  } catch (error) {
    analysis.value = null
    analysisError.value = error.message
  } finally {
    analysisLoading.value = false
  }
}

function summarizeSyncResponse(mode, response) {
  if (mode === 'all') {
    const day = response.day || {}
    const night = response.night || {}
    return `Sync selesai. Day: ${day.inserted || 0} baru, ${day.updated || 0} update. Night: ${night.inserted || 0} baru, ${night.updated || 0} update.`
  }

  return `Sync ${mode} selesai. ${response.inserted || 0} data baru, ${response.updated || 0} data update.`
}

async function handleSync(mode) {
  syncLoading.value = true
  syncStatus.value = ''
  syncError.value = ''

  try {
    const response = await syncDrawResults(mode)
    syncStatus.value = summarizeSyncResponse(mode, response)
    await loadLatestResults(session.value)
  } catch (error) {
    syncError.value = error.message
  } finally {
    syncLoading.value = false
  }
}

function handleSessionChange(nextSession) {
  session.value = nextSession
  analysis.value = null
  analysisError.value = ''
  evaluation.value = null
  evaluationError.value = ''
  currentPayload.value = {
    session: nextSession,
    targetDate: '',
    targetDay: '',
    algorithmVersion: nextSession === 'day' ? 'day_v1' : 'night_v1',
  }
  loadLatestResults(nextSession)
}

onMounted(() => {
  loadLatestResults('day')
})
</script>

<template>
  <main class="app-shell">
    <AppHeader />

    <div class="container-fluid px-4 py-4">
      <div v-if="latestError" class="alert alert-warning">
        Error hasil terbaru: {{ latestError }}
      </div>
      <div v-if="syncStatus" class="alert alert-success">
        {{ syncStatus }}
      </div>
      <div v-if="syncError" class="alert alert-danger">
        Sync gagal: {{ syncError }}
      </div>

      <div class="row g-4 align-items-stretch">
        <div class="col-lg-4">
          <div class="stack-layout">
            <ControlPanel
              :sync-loading="syncLoading"
              @generate="handleGenerate"
              @refresh-results="loadLatestResults(session)"
              @sync-results="handleSync"
              @session-change="handleSessionChange"
            />
            <MistikChecker />
          </div>
        </div>

        <div class="col-lg-8">
          <LatestResults
            :results="latestResults"
            :loading="latestLoading"
            :session="session"
          />
        </div>

        <div class="col-12">
          <AnalysisResult
            :analysis="analysis"
            :loading="analysisLoading"
            :error="analysisError"
          />
        </div>
        <div class="col-12">
          <GeminiChat :analysis="analysis" />
        </div>
        <div class="col-12">
          <EvaluationPanel
            :session="currentPayload.session"
            :target-date="currentPayload.targetDate"
            :algorithm-version="currentPayload.algorithmVersion"
            :result="evaluation"
            :loading="evaluationLoading"
            :error="evaluationError"
            @evaluated="evaluation = $event"
            @loading="evaluationLoading = $event"
            @error="evaluationError = $event"
          />
        </div>
      </div>
    </div>
  </main>
</template>
