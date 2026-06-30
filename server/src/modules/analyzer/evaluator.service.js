import { AnalysisCandidate, AnalysisEvaluation } from './analyzer.model.js'

function normalizeResult(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 4)
}

function hasPair(values, pair) {
  return Array.isArray(values) && values.includes(pair)
}

function countDigitHits(poolDigits, actualDigits) {
  const pool = new Set(poolDigits || [])
  return actualDigits.filter((digit) => pool.has(digit)).length
}

function countPositionHits(candidate, actual) {
  return candidate
    .split('')
    .reduce((count, digit, index) => count + (actual[index] === digit ? 1 : 0), 0)
}

function bestPositionHit(candidates, actual) {
  return (candidates || []).reduce((best, candidate) => {
    return Math.max(best, countPositionHits(String(candidate), actual))
  }, 0)
}

function buildConclusion(score, exact4dHit) {
  if (exact4dHit) {
    return 'Exact 4D hit'
  }

  if (score >= 80) {
    return 'Strong candidate alignment'
  }

  if (score >= 55) {
    return 'Good digit and 2D alignment'
  }

  if (score >= 30) {
    return 'Partial signal hit'
  }

  return 'Weak or missed signal'
}

export function evaluateCandidate(candidate, actualResult) {
  const actual = normalizeResult(actualResult)

  if (actual.length !== 4) {
    const error = new Error('actualResult must contain at least 4 digits')
    error.statusCode = 400
    throw error
  }

  const actualDigits = actual.split('')
  const front = actual.slice(0, 2)
  const back = actual.slice(2, 4)
  const mainPoolHit = countDigitHits(candidate.digitPool?.main, actualDigits)
  const supportPoolHit = countDigitHits(candidate.digitPool?.support, actualDigits)
  const reservePoolHit = countDigitHits(candidate.digitPool?.reserve, actualDigits)
  const poolHit = mainPoolHit + supportPoolHit + reservePoolHit
  const front2dHit = hasPair(candidate.front2d, front)
  const back2dHit = hasPair(candidate.back2d, back)
  const exact4dHit = (candidate.candidates4d || []).includes(actual)
  const allPoolDigits = [
    ...(candidate.digitPool?.main || []),
    ...(candidate.digitPool?.support || []),
    ...(candidate.digitPool?.reserve || []),
  ]
  const digitHitCount = countDigitHits([...new Set(allPoolDigits)], actualDigits)
  const positionHitCount = bestPositionHit(candidate.candidates4d, actual)
  const score = Math.min(
    100,
    (exact4dHit ? 45 : 0)
      + (front2dHit ? 15 : 0)
      + (back2dHit ? 15 : 0)
      + digitHitCount * 5
      + positionHitCount * 5
      + mainPoolHit * 3
      + supportPoolHit * 2
      + reservePoolHit,
  )
  const conclusion = buildConclusion(score, exact4dHit)

  return {
    poolHit,
    mainPoolHit,
    supportPoolHit,
    reservePoolHit,
    front2dHit,
    back2dHit,
    exact4dHit,
    digitHitCount,
    positionHitCount,
    score,
    conclusion,
  }
}

export async function evaluateAnalysis({
  session = 'night',
  targetDate,
  actualResult,
  algorithmVersion,
}) {
  const candidate = await AnalysisCandidate.findOne({
    market: 'nex4d',
    session,
    targetDateText: targetDate,
    algorithmVersion,
  }).lean()

  if (!candidate) {
    const error = new Error('Analysis candidate not found')
    error.statusCode = 404
    throw error
  }

  const normalizedActual = normalizeResult(actualResult)
  const evaluation = evaluateCandidate(candidate, normalizedActual)
  const saved = await AnalysisEvaluation.findOneAndUpdate(
    {
      market: candidate.market,
      session: candidate.session,
      targetDateText: candidate.targetDateText,
      algorithmVersion: candidate.algorithmVersion,
      actualResult: normalizedActual,
    },
    {
      $set: {
        candidateId: candidate._id,
        market: candidate.market,
        session: candidate.session,
        targetDateText: candidate.targetDateText,
        algorithmVersion: candidate.algorithmVersion,
        actualResult: normalizedActual,
        evaluation,
        score: evaluation.score,
        conclusion: evaluation.conclusion,
      },
    },
    {
      includeResultMetadata: true,
      new: true,
      upsert: true,
    },
  )

  return {
    ok: true,
    operation: saved.lastErrorObject?.updatedExisting ? 'updated' : 'inserted',
    data: saved.value || saved,
  }
}

export async function getEvaluations({
  session,
  targetDate,
  algorithmVersion,
  limit = 10,
}) {
  const query = { market: 'nex4d' }

  if (session) {
    query.session = session
  }

  if (targetDate) {
    query.targetDateText = targetDate
  }

  if (algorithmVersion) {
    query.algorithmVersion = algorithmVersion
  }

  return AnalysisEvaluation.find(query)
    .sort({ updatedAt: -1, createdAt: -1 })
    .limit(limit)
    .lean()
}
