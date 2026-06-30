import {
  createAiError,
  getGenerateResultFromBody,
  validateDevPrompt,
} from './ai.schema.js'
import {
  analyzeNex4dCandidates,
  generateDevelopmentText,
} from './gemini.service.js'

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 20
const rateLimitStore = new Map()

function clientIp(request) {
  return request.ip || request.headers['x-forwarded-for'] || request.socket?.remoteAddress || 'unknown'
}

function assertRateLimit(request) {
  const key = String(clientIp(request)).split(',')[0].trim()
  const now = Date.now()
  const record = rateLimitStore.get(key)

  if (!record || now - record.startedAt > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(key, {
      startedAt: now,
      count: 1,
    })
    return
  }

  record.count += 1
  if (record.count > RATE_LIMIT_MAX) {
    throw createAiError('Too many AI requests', 'rate_limited', 429)
  }
}

function assertAiAuth(request) {
  const expectedKey = process.env.AI_ANALYST_API_KEY

  if (!expectedKey && process.env.NODE_ENV === 'production') {
    throw createAiError('AI_ANALYST_API_KEY is required in production', 'auth_failed', 500)
  }

  if (!expectedKey) {
    return
  }

  const providedKey = request.headers['x-ai-analyst-key']
  if (providedKey !== expectedKey) {
    throw createAiError('AI analyst auth failed', 'auth_failed', 401)
  }
}

export function sendAiError(response, error) {
  const reason = error.reason || 'gemini_error'
  const statusCode = error.statusCode || (reason === 'invalid_payload' ? 400 : 502)

  response.status(statusCode).json({
    ok: false,
    message: reason === 'invalid_payload'
      ? error.message
      : 'AI analysis failed',
    reason,
  })
}

export async function analyzeCandidates(request, response) {
  try {
    assertAiAuth(request)
    assertRateLimit(request)

    const generateResult = getGenerateResultFromBody(request.body)
    if (!generateResult) {
      console.warn('AI analyze-candidates invalid payload:', {
        contentType: request.headers['content-type'],
        contentLength: request.headers['content-length'],
        bodyType: Array.isArray(request.body) ? 'array' : typeof request.body,
        bodyKeys: request.body && typeof request.body === 'object' && !Array.isArray(request.body)
          ? Object.keys(request.body).slice(0, 10)
          : [],
      })
      response.status(400).json({
        ok: false,
        message: 'generateResult is required before AI analysis',
        reason: 'invalid_payload',
      })
      return
    }

    const result = await analyzeNex4dCandidates(generateResult)

    response.json({
      ok: true,
      model: result.model,
      data: result.analysis,
      meta: {
        parseFailed: result.parseFailed,
      },
    })
  } catch (error) {
    console.error('AI analyze-candidates failed:', error?.message || error)
    sendAiError(response, error)
  }
}

export async function devChat(request, response) {
  try {
    if (process.env.NODE_ENV === 'production') {
      response.status(403).json({
        ok: false,
        message: 'Development chat is disabled in production',
      })
      return
    }

    assertRateLimit(request)

    const prompt = validateDevPrompt(request.body?.prompt)
    const result = await generateDevelopmentText(prompt)

    response.json({
      ok: true,
      warning: 'Development-only endpoint. Do not use this as Nex4D analyst output.',
      result,
    })
  } catch (error) {
    console.error('AI dev chat failed:', error?.message || error)
    sendAiError(response, error)
  }
}
