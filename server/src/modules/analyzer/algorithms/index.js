import { runDayV1 } from './day-v1.js'
import { runDayV2 } from './day-v2.js'
import { runNightV1 } from './night-v1.js'
import { runNightV2 } from './night-v2.js'
export { getDominantDigits } from './dominant.js'

const ALGORITHMS = {
  day_v1: runDayV1,
  day_v2: runDayV2,
  night_v1: runNightV1,
  night_v2: runNightV2,
}

export function runAlgorithm(version, context) {
  const algorithm = ALGORITHMS[version]

  if (!algorithm) {
    const error = new Error('algorithmVersion is not supported')
    error.statusCode = 400
    throw error
  }

  return algorithm(context)
}

export function getSupportedAlgorithms() {
  return Object.keys(ALGORITHMS)
}
