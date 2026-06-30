<script setup>
import { ref, watch } from 'vue'
import { evaluateAnalysis } from '../services/api'
import { booleanLabel } from '../utils/format'

const props = defineProps({
  session: {
    type: String,
    default: 'day',
  },
  targetDate: {
    type: String,
    default: '',
  },
  algorithmVersion: {
    type: String,
    default: '',
  },
  result: {
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

const emit = defineEmits(['evaluated', 'loading', 'error'])

const actualResult = ref('')

watch(
  () => [props.session, props.targetDate, props.algorithmVersion],
  () => {
    actualResult.value = ''
  },
)

async function submit() {
  const normalized = actualResult.value.replace(/\D/g, '').slice(0, 4)

  if (normalized.length !== 4) {
    emit('error', 'Result aktual harus 4 digit.')
    return
  }

  emit('loading', true)
  emit('error', '')

  try {
    const response = await evaluateAnalysis({
      session: props.session,
      targetDate: props.targetDate,
      actualResult: normalized,
      algorithmVersion: props.algorithmVersion,
    })
    emit('evaluated', response.data || response)
  } catch (error) {
    emit('error', error.message)
  } finally {
    emit('loading', false)
  }
}

function hitClass(value) {
  return value ? 'text-bg-success' : 'text-bg-secondary'
}
</script>

<template>
  <section class="card app-card">
    <div class="card-body">
      <div class="d-flex align-items-center justify-content-between gap-3 mb-3">
        <h2 class="section-title mb-0">Panel Evaluasi</h2>
        <span class="badge text-bg-light border">{{ algorithmVersion || '-' }}</span>
      </div>

      <form class="row g-2 align-items-end mb-3" @submit.prevent="submit">
        <div class="col-md-8">
          <label class="form-label fw-semibold" for="actual-result">Result Aktual</label>
          <input
            id="actual-result"
            v-model="actualResult"
            class="form-control"
            inputmode="numeric"
            maxlength="4"
            placeholder="1234"
          />
        </div>
        <div class="col-md-4 d-grid">
          <button
            class="btn btn-dark"
            type="submit"
            :disabled="loading || !targetDate || !algorithmVersion"
          >
            {{ loading ? 'Mengevaluasi...' : 'Evaluasi' }}
          </button>
        </div>
      </form>

      <div v-if="error" class="alert alert-danger">{{ error }}</div>
      <div v-if="!result" class="empty-state">Belum ada evaluasi.</div>

      <template v-else>
        <div class="evaluation-grid">
          <article>
            <span>Result Aktual</span>
            <strong>{{ result.actualResult }}</strong>
          </article>
          <article>
            <span>Skor</span>
            <strong>{{ result.score }}</strong>
          </article>
          <article>
            <span>Kesimpulan</span>
            <strong>{{ result.conclusion }}</strong>
          </article>
        </div>

        <div class="badge-list mt-3">
          <span :class="['badge', hitClass(result.evaluation?.front2dHit)]">
            FRONT {{ booleanLabel(result.evaluation?.front2dHit) }}
          </span>
          <span :class="['badge', hitClass(result.evaluation?.back2dHit)]">
            BACK {{ booleanLabel(result.evaluation?.back2dHit) }}
          </span>
          <span :class="['badge', result.evaluation?.exact4dHit ? 'text-bg-danger' : 'text-bg-secondary']">
            {{ result.evaluation?.exact4dHit ? 'EXACT' : 'NO EXACT' }}
          </span>
          <span class="badge text-bg-primary">POOL {{ result.evaluation?.poolHit }}</span>
          <span class="badge text-bg-primary">MAIN {{ result.evaluation?.mainPoolHit }}</span>
          <span class="badge text-bg-warning text-dark">SUPPORT {{ result.evaluation?.supportPoolHit }}</span>
          <span class="badge text-bg-secondary">RESERVE {{ result.evaluation?.reservePoolHit }}</span>
          <span class="badge text-bg-info">DIGIT {{ result.evaluation?.digitHitCount }}</span>
          <span class="badge text-bg-dark">POSITION {{ result.evaluation?.positionHitCount }}</span>
        </div>
      </template>
    </div>
  </section>
</template>
