<script setup>
import { digitList } from '../utils/format'

defineProps({
  front2d: {
    type: Array,
    default: () => [],
  },
  back2d: {
    type: Array,
    default: () => [],
  },
  candidates4d: {
    type: Array,
    default: () => [],
  },
})

function displayCandidate(candidate) {
  return candidate?.candidate || candidate
}

function displayMeta(candidate) {
  if (!candidate || typeof candidate !== 'object') {
    return ''
  }

  const rank = candidate.rankLabel || (candidate.rank ? `#${candidate.rank}` : '')
  const score = candidate.finalScore ?? null

  return [rank, score === null ? '' : `Score ${score}`].filter(Boolean).join(' / ')
}
</script>

<template>
  <div class="row g-3">
    <div v-if="front2d.length" class="col-lg-3">
      <div class="mini-panel h-100">
        <h3 class="mini-title">2D Depan</h3>
        <div class="badge-list">
          <span v-for="item in front2d" :key="`front-${item}`" class="badge text-bg-primary">
            {{ item }}
          </span>
        </div>
      </div>
    </div>

    <div v-if="back2d.length" class="col-lg-3">
      <div class="mini-panel h-100">
        <h3 class="mini-title">2D Belakang</h3>
        <div class="badge-list">
          <span v-for="item in back2d" :key="`back-${item}`" class="badge text-bg-success">
            {{ item }}
          </span>
        </div>
      </div>
    </div>

    <div :class="front2d.length || back2d.length ? 'col-lg-6' : 'col-12'">
      <div class="mini-panel h-100">
        <h3 class="mini-title">Kandidat 4D</h3>
        <div v-if="!candidates4d.length" class="empty-state py-3">Belum ada kandidat.</div>
        <div
          v-for="candidate in candidates4d"
          v-else
          :key="`candidate-${displayCandidate(candidate)}`"
          class="candidate-row"
        >
          <div v-if="displayMeta(candidate)" class="candidate-meta">
            {{ displayMeta(candidate) }}
          </div>
          <span
            v-for="(digit, index) in digitList(displayCandidate(candidate))"
            :key="`${displayCandidate(candidate)}-${index}`"
            class="digit-ball"
          >
            {{ digit }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
