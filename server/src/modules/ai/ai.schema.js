const VALID_SESSIONS = new Set(['day', 'night'])
const VALID_CONFIDENCE = new Set(['low', 'medium', 'high'])
const VALID_SOURCE_STATUS = new Set(['weak', 'fair', 'good'])
const VALID_LAYERS = new Set(['base', 'head-middle-tail', 'derived', 'mistik', 'unknown'])
const MAX_GENERATE_RESULT_BYTES = 120_000
export const MAX_DEV_PROMPT_LENGTH = 4000

export function createAiError(message, reason, statusCode = 400) {
  const error = new Error(message)
  error.reason = reason
  error.statusCode = statusCode
  return error
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function stringValue(value) {
  return typeof value === 'string' ? value : ''
}

function arrayValue(value) {
  return Array.isArray(value) ? value : []
}

function parseJsonObject(value) {
  if (typeof value !== 'string') {
    return null
  }

  const text = value.trim()
  if (!text || (!text.startsWith('{') && !text.startsWith('['))) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch (_error) {
    return null
  }
}

function normalize4d(value) {
  const text = String(value || '').trim()
  return /^\d{4}$/.test(text) ? text : ''
}

function clampPercent(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) {
    return 0
  }

  return Math.max(0, Math.min(100, Math.round(number)))
}

export function getGenerateResultFromBody(body) {
  const parsedBody = parseJsonObject(body)
  if (parsedBody) {
    return getGenerateResultFromBody(parsedBody)
  }

  if (Array.isArray(body)) {
    return body.length === 1 ? getGenerateResultFromBody(body[0]) : null
  }

  if (!isObject(body)) {
    return null
  }

  for (const key of ['generateResult', 'data', 'dataDraw', 'response', 'result', 'payload', 'body']) {
    const value = body[key]
    if (isObject(value) || Array.isArray(value) || parseJsonObject(value)) {
      return getGenerateResultFromBody(value)
    }
  }

  if (typeof body.rawBody === 'string') {
    return getGenerateResultFromBody(body.rawBody)
  }

  if (typeof body.json === 'string') {
    return getGenerateResultFromBody(body.json)
  }

  return Object.keys(body).length ? body : null
}

export function validateGenerateResult(generateResult) {
  if (!isObject(generateResult)) {
    throw createAiError('generateResult is required before AI analysis', 'invalid_payload')
  }

  const serialized = JSON.stringify(generateResult)
  if (serialized.length > MAX_GENERATE_RESULT_BYTES) {
    throw createAiError('generateResult payload is too large', 'invalid_payload')
  }

  if (!VALID_SESSIONS.has(generateResult.session)) {
    throw createAiError('session must be day or night', 'invalid_payload')
  }

  const targetDate = stringValue(generateResult.targetDateText) || stringValue(generateResult.targetDate)

  for (const field of ['targetDay', 'algorithmVersion']) {
    if (!stringValue(generateResult[field])) {
      throw createAiError(`${field} is required`, 'invalid_payload')
    }
  }

  if (!targetDate) {
    throw createAiError('targetDate is required', 'invalid_payload')
  }

  if (!Array.isArray(generateResult.candidates4d)) {
    throw createAiError('candidates4d must be an array', 'invalid_payload')
  }

  return {
    session: generateResult.session,
    targetDate,
    targetDay: generateResult.targetDay,
    algorithmVersion: generateResult.algorithmVersion,
    sources: isObject(generateResult.sources) ? generateResult.sources : {},
    transformations: isObject(generateResult.transformations) ? generateResult.transformations : {},
    input: isObject(generateResult.input) ? generateResult.input : {},
    digitPool: isObject(generateResult.digitPool) ? generateResult.digitPool : {},
    weightedDigitScore: isObject(generateResult.weightedDigitScore)
      ? generateResult.weightedDigitScore
      : isObject(generateResult.digitPool?.weighted)
        ? generateResult.digitPool.weighted
        : {},
    front2d: arrayValue(generateResult.front2d),
    back2d: arrayValue(generateResult.back2d),
    candidates4d: generateResult.candidates4d.map(String).filter((value) => /^\d{4}$/.test(value)),
    headTailAnalysis: isObject(generateResult.headTailAnalysis) ? generateResult.headTailAnalysis : {},
    middle2dAnalysis: isObject(generateResult.middle2dAnalysis) ? generateResult.middle2dAnalysis : {},
    candidateLayers: isObject(generateResult.candidateLayers) ? generateResult.candidateLayers : {},
    evaluation: isObject(generateResult.evaluation) ? generateResult.evaluation : {},
    notes: arrayValue(generateResult.notes),
  }
}

function normalizeCandidateReasonList(value) {
  return arrayValue(value)
    .map((item) => {
      if (typeof item === 'string') {
        return {
          number: normalize4d(item),
          reason: '',
        }
      }

      if (!isObject(item)) {
        return null
      }

      return {
        number: normalize4d(item.number),
        reason: stringValue(item.reason),
      }
    })
    .filter((item) => item?.number)
}

export function buildAiFallback(debugNote = 'Invalid AI JSON response') {
  return {
    summary: 'AI response could not be parsed as JSON.',
    confidence: 'low',
    confidence_percent: 0,
    main_reading: '',
    source_quality: {
      status: 'weak',
      reason: '',
    },
    candidate_rank: [],
    raise_candidates: [],
    lower_candidates: [],
    warnings: ['Invalid AI JSON response'],
    final_poc: [],
    debug_notes: [debugNote],
  }
}

export function normalizeAiAnalysis(value, generateResult = {}) {
  if (!isObject(value)) {
    return buildAiFallback()
  }

  const candidateSet = new Set((generateResult.candidates4d || []).map(String))
  const sourceQuality = isObject(value.source_quality) ? value.source_quality : {}
  const candidateRank = arrayValue(value.candidate_rank)
    .map((item, index) => {
      if (typeof item === 'string') {
        return {
          number: normalize4d(item),
          rank: index + 1,
          layer: 'unknown',
          reason: '',
        }
      }

      if (!isObject(item)) {
        return null
      }

      const layer = VALID_LAYERS.has(item.layer) ? item.layer : 'unknown'
      return {
        number: normalize4d(item.number),
        rank: Number.isFinite(Number(item.rank)) ? Number(item.rank) : index + 1,
        layer,
        reason: stringValue(item.reason),
      }
    })
    .filter((item) => item?.number && (!candidateSet.size || candidateSet.has(item.number)))
    .slice(0, 10)

  const finalPoc = arrayValue(value.final_poc)
    .map(normalize4d)
    .filter((number) => number && (!candidateSet.size || candidateSet.has(number)))
    .slice(0, 5)

  return {
    summary: stringValue(value.summary),
    confidence: VALID_CONFIDENCE.has(value.confidence) ? value.confidence : 'low',
    confidence_percent: clampPercent(value.confidence_percent),
    main_reading: stringValue(value.main_reading),
    source_quality: {
      status: VALID_SOURCE_STATUS.has(sourceQuality.status) ? sourceQuality.status : 'weak',
      reason: stringValue(sourceQuality.reason),
    },
    candidate_rank: candidateRank,
    raise_candidates: normalizeCandidateReasonList(value.raise_candidates)
      .filter((item) => !candidateSet.size || candidateSet.has(item.number))
      .slice(0, 10),
    lower_candidates: normalizeCandidateReasonList(value.lower_candidates)
      .filter((item) => !candidateSet.size || candidateSet.has(item.number))
      .slice(0, 10),
    warnings: arrayValue(value.warnings).map(String).slice(0, 20),
    final_poc: finalPoc,
    debug_notes: arrayValue(value.debug_notes).map(String).slice(0, 20),
  }
}

export function validateDevPrompt(prompt) {
  const text = String(prompt || '')
  if (!text.trim()) {
    throw createAiError('Missing prompt in request body', 'invalid_payload')
  }

  if (text.length > MAX_DEV_PROMPT_LENGTH) {
    throw createAiError(`prompt must be ${MAX_DEV_PROMPT_LENGTH} characters or fewer`, 'invalid_payload')
  }

  return text
}
