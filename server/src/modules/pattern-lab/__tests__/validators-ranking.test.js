import assert from 'node:assert/strict'
import test from 'node:test'
import { generateCandidatePool } from '../candidate-generator.js'
import { rankCandidates } from '../ranking.js'
import { validateCandidate } from '../validators/index.js'

const historicalDraws = [
  { _id: 'a', weekOffset: 1, normalizedResult: '5562' },
  { _id: 'b', weekOffset: 2, normalizedResult: '1562' },
  { _id: 'c', weekOffset: 3, normalizedResult: '9062' },
]

test('generateCandidatePool accepts and rejects only by score range', () => {
  const pool = generateCandidatePool({
    currentWeightProfile: {
      0: 10,
      1: 10,
      2: 10,
      3: 10,
      4: 10,
      5: 50,
      6: 50,
      7: 10,
      8: 10,
      9: 10,
    },
    suggestedScoreRange: { min: 160, max: 210 },
  })

  const accepted = pool.find((item) => item.candidate === '5562')
  const rejected = pool.find((item) => item.candidate === '0000')

  assert.equal(accepted.status, 'accepted')
  assert.equal(accepted.dsv1Score, 160)
  assert.equal(rejected.status, 'rejected')
  assert.match(rejected.rejectionReason, /outside suggested range/)
})

test('validateCandidate returns pluggable evidence and support', () => {
  const validation = validateCandidate('5562', { historicalDraws })

  assert.ok(validation.supportScore > 0)
  assert.equal(validation.validationResults.length, 8)
  assert.ok(validation.validationResults.every((item) => item.reason && item.evidence))
})

test('rankCandidates is deterministic on final score and candidate tie-breaker', () => {
  const ranked = rankCandidates([
    {
      _id: '1',
      candidate: '5562',
      status: 'accepted',
      dsv1Score: 170,
      supportScore: 10,
      historicalWeight: 5,
      frequencyWeight: 1,
      validationResults: [],
    },
    {
      _id: '2',
      candidate: '1562',
      status: 'accepted',
      dsv1Score: 170,
      supportScore: 10,
      historicalWeight: 5,
      frequencyWeight: 1,
      validationResults: [],
    },
  ])

  assert.equal(ranked[0].candidate, '1562')
  assert.equal(ranked[0].rank, 1)
  assert.equal(ranked[0].rankLabel, 'A')
})
