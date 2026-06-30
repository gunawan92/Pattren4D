export const DIGITS = Object.freeze(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'])

export function normalize4d(value) {
  const text = String(value || '').replace(/\D/g, '').slice(0, 4)
  return /^\d{4}$/.test(text) ? text : ''
}

export function parseTargetDate(value) {
  const date = new Date(`${value}T00:00:00.000Z`)

  if (!value || Number.isNaN(date.getTime())) {
    const error = new Error('targetDate must be a valid YYYY-MM-DD date')
    error.statusCode = 400
    throw error
  }

  return date
}

export function toDateText(date) {
  return date.toISOString().slice(0, 10)
}

export function normalizeDayName(value) {
  const day = String(value || '').trim().toLowerCase()
  const days = {
    sunday: 'Minggu',
    monday: 'Senin',
    tuesday: 'Selasa',
    wednesday: 'Rabu',
    thursday: 'Kamis',
    friday: 'Jumat',
    saturday: 'Sabtu',
    minggu: 'Minggu',
    senin: 'Senin',
    selasa: 'Selasa',
    rabu: 'Rabu',
    kamis: 'Kamis',
    jumat: 'Jumat',
    sabtu: 'Sabtu',
  }

  return days[day] || String(value || '').trim()
}

export function dayNameFromDate(date) {
  return ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][date.getUTCDay()]
}

export function subtractDays(date, days) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() - days)
  return next
}

export function numberFromDigits(value) {
  return String(value || '').replace(/\D/g, '').split('')
}

export function scoreNumber(number, profile) {
  return numberFromDigits(number).reduce((total, digit) => {
    return total + Number(profile?.[digit] || 0)
  }, 0)
}

export function normalizeWeightProfile(profile = {}) {
  return DIGITS.reduce((result, digit) => {
    const value = Number(profile[digit])
    result[digit] = Number.isFinite(value) ? value : 0
    return result
  }, {})
}

export function profileFromHistoricalDraws(draws) {
  const counts = DIGITS.reduce((result, digit) => ({ ...result, [digit]: 0 }), {})
  let total = 0

  for (const draw of draws || []) {
    for (const digit of numberFromDigits(draw.result4d || draw.drawNumber)) {
      counts[digit] += 1
      total += 1
    }
  }

  return DIGITS.reduce((profile, digit) => {
    profile[digit] = total ? Math.round((counts[digit] / total) * 100) : 0
    return profile
  }, {})
}

export function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

export function median(values) {
  if (!values.length) {
    return 0
  }

  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

export function mode(values) {
  if (!values.length) {
    return []
  }

  const counts = values.reduce((result, value) => {
    result[value] = (result[value] || 0) + 1
    return result
  }, {})
  const maxCount = Math.max(...Object.values(counts))

  return Object.entries(counts)
    .filter(([, count]) => count === maxCount)
    .map(([value]) => Number(value))
    .sort((a, b) => a - b)
}

export function standardDeviation(values) {
  if (!values.length) {
    return 0
  }

  const average = mean(values)
  const variance = mean(values.map((value) => (value - average) ** 2))
  return Math.sqrt(variance)
}

export function trend(values) {
  if (values.length < 2) {
    return 'flat'
  }

  const first = values[0]
  const last = values[values.length - 1]

  if (last > first) {
    return 'up'
  }

  if (last < first) {
    return 'down'
  }

  return 'flat'
}

export function scoreDistribution(values, bucketSize = 25) {
  return values.reduce((result, value) => {
    const start = Math.floor(value / bucketSize) * bucketSize
    const key = `${start}-${start + bucketSize - 1}`
    result[key] = (result[key] || 0) + 1
    return result
  }, {})
}

export function calculateScoreStatistics(scores) {
  const roundedMean = Number(mean(scores).toFixed(2))
  const roundedMedian = Number(median(scores).toFixed(2))
  const roundedStdDev = Number(standardDeviation(scores).toFixed(2))
  const min = scores.length ? Math.min(...scores) : 0
  const max = scores.length ? Math.max(...scores) : 0
  const lower = Math.max(min, Math.floor(roundedMean - roundedStdDev))
  const upper = Math.min(max, Math.ceil(roundedMean + roundedStdDev))

  return {
    min,
    max,
    average: roundedMean,
    median: roundedMedian,
    mode: mode(scores),
    standardDeviation: roundedStdDev,
    trend: trend(scores),
    scoreDistribution: scoreDistribution(scores),
    suggestedScoreRange: {
      min: lower <= upper ? lower : min,
      max: lower <= upper ? upper : max,
    },
  }
}

export function digitFrequency(draws) {
  return DIGITS.reduce((result, digit) => {
    result[digit] = (draws || []).reduce((count, draw) => {
      return count + numberFromDigits(draw.result4d || draw.drawNumber).filter((item) => item === digit).length
    }, 0)
    return result
  }, {})
}

export function positionFrequency(draws) {
  return [0, 1, 2, 3].map((position) => {
    return DIGITS.reduce((result, digit) => {
      result[digit] = (draws || []).reduce((count, draw) => {
        const number = normalize4d(draw.result4d || draw.drawNumber)
        return count + (number[position] === digit ? 1 : 0)
      }, 0)
      return result
    }, {})
  })
}

export function all4dCandidates() {
  const result = []

  for (let value = 0; value <= 9999; value += 1) {
    result.push(String(value).padStart(4, '0'))
  }

  return result
}
