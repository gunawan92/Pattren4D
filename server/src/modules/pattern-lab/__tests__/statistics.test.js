import assert from 'node:assert/strict'
import test from 'node:test'
import {
  all4dCandidates,
  calculateScoreStatistics,
  normalizeWeightProfile,
  scoreNumber,
} from '../statistics.js'

test('scoreNumber keeps leading-zero candidates deterministic', () => {
  const profile = normalizeWeightProfile({
    0: 10,
    1: 20,
    2: 30,
    3: 40,
  })

  assert.equal(scoreNumber('0012', profile), 70)
})

test('calculateScoreStatistics derives range from data', () => {
  const stats = calculateScoreStatistics([140, 160, 210, 140, 200])

  assert.equal(stats.min, 140)
  assert.equal(stats.max, 210)
  assert.equal(stats.average, 170)
  assert.deepEqual(stats.mode, [140])
  assert.deepEqual(stats.suggestedScoreRange, { min: 140, max: 200 })
})

test('all4dCandidates returns complete brute-force search space', () => {
  const candidates = all4dCandidates()

  assert.equal(candidates.length, 10000)
  assert.equal(candidates[0], '0000')
  assert.equal(candidates[9999], '9999')
})
