<script setup>
import { ref } from 'vue'
import { checkMistik } from '../services/api'
import { digitList } from '../utils/format'

const number = ref('')
const result = ref(null)
const loading = ref(false)
const error = ref('')

async function submit() {
  const normalized = number.value.replace(/\D/g, '').slice(0, 4)

  if (normalized.length !== 4) {
    error.value = 'Masukkan 4 digit.'
    return
  }

  loading.value = true
  error.value = ''

  try {
    result.value = await checkMistik(normalized)
  } catch (requestError) {
    error.value = requestError.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="card app-card">
    <div class="card-body">
      <h2 class="section-title mb-3">Cek Mistik</h2>
      <form class="row g-2 mb-3" @submit.prevent="submit">
        <div class="col-8">
          <input
            v-model="number"
            class="form-control"
            inputmode="numeric"
            maxlength="4"
            placeholder="2972"
          />
        </div>
        <div class="col-4 d-grid">
          <button class="btn btn-outline-dark" type="submit" :disabled="loading">
            {{ loading ? '...' : 'Cek' }}
          </button>
        </div>
      </form>

      <div v-if="error" class="alert alert-danger py-2">{{ error }}</div>
      <div v-if="!result" class="empty-state py-3">Cek transformasi 4 digit.</div>

      <div v-else class="mistik-stack">
        <div v-for="row in [
          ['Angka Asli', result.original],
          ['Mistik Lama', result.mistikLama],
          ['Mistik Baru', result.mistikBaru],
        ]" :key="row[0]" class="mini-panel">
          <span class="field-label">{{ row[0] }}</span>
          <div>
            <span
              v-for="(digit, index) in digitList(row[1])"
              :key="`${row[0]}-${index}`"
              class="digit-ball"
            >
              {{ digit }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
