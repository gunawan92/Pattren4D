import { DIGITS, normalizeWeightProfile } from './statistics.js'

const BAND_ORDER = Object.freeze(['low', 'medium', 'high'])

function mean(values) {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0
}

function standardDeviation(values) {
  if (!values.length) {
    return 0
  }

  const average = mean(values)
  return Math.sqrt(mean(values.map((value) => (value - average) ** 2)))
}

function bandLabel(index) {
  return BAND_ORDER[index] || 'high'
}

export function buildScoreClusters(scores) {
  const sorted = [...scores].filter((score) => Number.isFinite(score)).sort((a, b) => a - b)

  if (!sorted.length) {
    return BAND_ORDER.map((band) => ({
      band,
      min: 0,
      max: 0,
      count: 0,
      frequency: 0,
      scores: [],
    }))
  }

  const min = sorted[0]
  const max = sorted[sorted.length - 1]
  const width = Math.max(1, Math.ceil((max - min + 1) / BAND_ORDER.length))
  const clusters = BAND_ORDER.map((band, index) => {
    const start = min + (index * width)
    const end = index === BAND_ORDER.length - 1 ? max : start + width - 1
    const bandScores = sorted.filter((score) => score >= start && score <= end)

    return {
      band,
      min: start,
      max: end,
      count: bandScores.length,
      frequency: Number((bandScores.length / sorted.length).toFixed(4)),
      scores: bandScores,
    }
  })

  return clusters
}

export function scoreBand(score, clusters) {
  const matched = clusters.find((cluster) => score >= cluster.min && score <= cluster.max)

  if (matched) {
    return matched.band
  }

  const closest = [...clusters].sort((first, second) => {
    const firstDistance = Math.min(Math.abs(score - first.min), Math.abs(score - first.max))
    const secondDistance = Math.min(Math.abs(score - second.min), Math.abs(score - second.max))
    return firstDistance - secondDistance
  })[0]

  return closest?.band || 'medium'
}

export function scoreClusterForBand(band, clusters) {
  return clusters.find((cluster) => cluster.band === band) || clusters[1] || clusters[0]
}

export function analyzeDigitTrends(snapshots) {
  const rows = DIGITS.map((digit) => {
    const values = snapshots.map((snapshot) => Number(snapshot.profile?.[digit] || 0))
    const first = values[values.length - 1] || 0
    const latest = values[0] || 0
    const average = Number(mean(values).toFixed(2))
    const deviation = Number(standardDeviation(values).toFixed(2))
    const delta = latest - first
    const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'
    const stability = deviation <= 15 ? 'stable' : deviation <= 35 ? 'shifting' : 'volatile'

    return {
      digit,
      values,
      latest,
      average,
      deviation,
      delta,
      direction,
      stability,
    }
  })

  return {
    stableDigits: rows.filter((row) => row.stability === 'stable').map((row) => row.digit),
    shiftingDigits: rows.filter((row) => row.stability !== 'stable').map((row) => row.digit),
    trends: rows,
  }
}

export function buildHistoricalPatternAnalysis({ snapshots, scores }) {
  const scoreClusters = buildScoreClusters(scores)
  const digitTrends = analyzeDigitTrends(snapshots)
  const dominantBand = [...scoreClusters].sort((a, b) => {
    const countDiff = b.count - a.count
    if (countDiff !== 0) {
      return countDiff
    }

    return BAND_ORDER.indexOf(a.band) - BAND_ORDER.indexOf(b.band)
  })[0]?.band || 'medium'

  return {
    scoreClusters,
    dominantBand,
    digitTrends,
    snapshots: snapshots.map((snapshot) => ({
      weekOffset: snapshot.weekOffset,
      drawDateText: snapshot.drawDateText,
      result4d: snapshot.result4d,
      profile: normalizeWeightProfile(snapshot.profile),
      source: snapshot.source,
    })),
  }
}

export function clusterConsistencyScore(band, patternAnalysis) {
  const cluster = scoreClusterForBand(band, patternAnalysis.scoreClusters)
  return Math.round((cluster?.frequency || 0) * 100)
}

export function clusterEvidence({ candidate, score, band, patternAnalysis }) {
  const cluster = scoreClusterForBand(band, patternAnalysis.scoreClusters)
  const digits = String(candidate || '').split('')
  const trendMatches = digits.filter((digit) => {
    const trend = patternAnalysis.digitTrends.trends.find((row) => row.digit === digit)
    return trend?.stability === 'stable' || trend?.direction === 'up'
  })

  return {
    band,
    score,
    clusterRange: cluster ? { min: cluster.min, max: cluster.max } : null,
    clusterFrequency: cluster?.frequency || 0,
    clusterCount: cluster?.count || 0,
    dominantBand: patternAnalysis.dominantBand,
    trendMatches,
  }
}

export function bandSortWeight(band) {
  const index = BAND_ORDER.indexOf(band)
  return index === -1 ? 1 : index
}
