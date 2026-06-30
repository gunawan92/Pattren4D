import {
  digitFrequency,
  numberFromDigits,
  positionFrequency,
} from '../statistics.js'

function result(module, supportScore, reason, evidence = {}, passed = true) {
  return {
    module,
    supportScore,
    passed,
    reason,
    evidence,
  }
}

function candidateDigits(candidate) {
  return numberFromDigits(candidate).slice(0, 4)
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0)
}

export function historicalDigitFrequencyValidator(candidate, context) {
  const frequency = digitFrequency(context.historicalDraws)
  const hits = candidateDigits(candidate).map((digit) => frequency[digit] || 0)
  const supportScore = sum(hits) * 2

  return result(
    'historical_digit_frequency',
    supportScore,
    'Candidate digits scored by frequency across selected historical draws',
    { frequency, hits },
  )
}

export function historicalPositionFrequencyValidator(candidate, context) {
  const frequency = positionFrequency(context.historicalDraws)
  const hits = candidateDigits(candidate).map((digit, index) => frequency[index][digit] || 0)
  const supportScore = sum(hits) * 4

  return result(
    'historical_position_frequency',
    supportScore,
    'Candidate digits scored by matching historical position frequency',
    { positionFrequency: frequency, hits },
  )
}

export function slidingWindowValidator(candidate, context) {
  const windows = [1, 2, 3, 7].map((size) => {
    const draws = context.historicalDraws.slice(0, size)
    const frequency = digitFrequency(draws)
    const support = sum(candidateDigits(candidate).map((digit) => frequency[digit] || 0))
    return { size, support }
  })
  const supportScore = sum(windows.map((item) => item.support))

  return result(
    'sliding_window',
    supportScore,
    'Candidate received support from recent historical windows',
    { windows },
  )
}

export function asHeadValidator(candidate, context) {
  const head = candidate[0]
  const matches = context.historicalDraws.filter((draw) => {
    const value = String(draw.normalizedResult || draw.result4d || draw.drawNumber || '')
    return value[0] === head
  })

  return result(
    'as_head',
    matches.length * 8,
    'Candidate head digit compared with historical AS head',
    { head, matchingDrawIds: matches.map((draw) => draw._id) },
  )
}

export function asTailValidator(candidate, context) {
  const tail = candidate[3]
  const matches = context.historicalDraws.filter((draw) => {
    const value = String(draw.normalizedResult || draw.result4d || draw.drawNumber || '')
    return value[3] === tail
  })

  return result(
    'as_tail',
    matches.length * 8,
    'Candidate tail digit compared with historical AS tail',
    { tail, matchingDrawIds: matches.map((draw) => draw._id) },
  )
}

export function repeatedDigitValidator(candidate) {
  const counts = candidateDigits(candidate).reduce((output, digit) => {
    output[digit] = (output[digit] || 0) + 1
    return output
  }, {})
  const repeated = Object.entries(counts)
    .filter(([, count]) => count > 1)
    .map(([digit, count]) => ({ digit, count }))
  const supportScore = repeated.reduce((total, item) => total + item.count * 3, 0)

  return result(
    'repeated_digit',
    supportScore,
    repeated.length ? 'Candidate contains repeated digits' : 'Candidate contains no repeated digits',
    { repeated },
  )
}

export function doubleDigitValidator(candidate, context) {
  const pairs = [candidate.slice(0, 2), candidate.slice(1, 3), candidate.slice(2, 4)]
  const historicalPairs = context.historicalDraws.flatMap((draw) => {
    const value = String(draw.normalizedResult || draw.result4d || draw.drawNumber || '')
    return [value.slice(0, 2), value.slice(1, 3), value.slice(2, 4)]
  })
  const hits = pairs.filter((pair) => historicalPairs.includes(pair))

  return result(
    'double_digit',
    hits.length * 7,
    'Candidate adjacent 2D pairs compared with historical adjacent pairs',
    { pairs, hits },
  )
}

export function historicalWeeklySupportValidator(candidate, context) {
  const candidateSet = new Set(candidateDigits(candidate))
  const support = context.historicalDraws.map((draw) => {
    const digits = candidateDigits(draw.normalizedResult || draw.result4d || draw.drawNumber)
    const hitCount = digits.filter((digit) => candidateSet.has(digit)).length
    return {
      drawId: draw._id,
      weekOffset: draw.weekOffset,
      result4d: draw.normalizedResult || draw.result4d || draw.drawNumber,
      hitCount,
    }
  })
  const supportScore = sum(support.map((item) => item.hitCount * 5))

  return result(
    'historical_weekly_support',
    supportScore,
    'Candidate digits compared with each selected weekly historical draw',
    { support },
  )
}

export const validators = Object.freeze([
  historicalDigitFrequencyValidator,
  historicalPositionFrequencyValidator,
  slidingWindowValidator,
  asHeadValidator,
  asTailValidator,
  repeatedDigitValidator,
  doubleDigitValidator,
  historicalWeeklySupportValidator,
])

export function validateCandidate(candidate, context, activeValidators = validators) {
  const validationResults = activeValidators.map((validator) => validator(candidate, context))
  const supportScore = validationResults.reduce((total, item) => total + item.supportScore, 0)

  return {
    validationResults,
    supportScore,
  }
}
