import { GoogleGenAI, Type } from '@google/genai'
import {
  buildAiFallback,
  createAiError,
  normalizeAiAnalysis,
  validateGenerateResult,
} from './ai.schema.js'
import {
  buildNex4dAnalystUserPrompt,
  NEX4D_AI_ANALYST_SYSTEM_PROMPT,
} from './nex4d-ai-analyst.prompt.js'

let aiClient = null

const SHORT_TEXT = {
  type: Type.STRING,
  maxLength: '260',
}

const REASON_ITEM_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    number: {
      type: Type.STRING,
      pattern: '^\\d{4}$',
    },
    reason: SHORT_TEXT,
  },
  required: ['number', 'reason'],
  propertyOrdering: ['number', 'reason'],
}

const NEX4D_ANALYSIS_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: SHORT_TEXT,
    confidence: {
      type: Type.STRING,
      format: 'enum',
      enum: ['low', 'medium', 'high'],
    },
    confidence_percent: {
      type: Type.INTEGER,
      minimum: 0,
      maximum: 100,
    },
    main_reading: SHORT_TEXT,
    source_quality: {
      type: Type.OBJECT,
      properties: {
        status: {
          type: Type.STRING,
          format: 'enum',
          enum: ['weak', 'fair', 'good'],
        },
        reason: SHORT_TEXT,
      },
      required: ['status', 'reason'],
      propertyOrdering: ['status', 'reason'],
    },
    candidate_rank: {
      type: Type.ARRAY,
      maxItems: '8',
      items: {
        type: Type.OBJECT,
        properties: {
          number: {
            type: Type.STRING,
            pattern: '^\\d{4}$',
          },
          rank: {
            type: Type.INTEGER,
            minimum: 1,
            maximum: 8,
          },
          layer: {
            type: Type.STRING,
            format: 'enum',
            enum: ['base', 'head-middle-tail', 'derived', 'mistik', 'unknown'],
          },
          reason: SHORT_TEXT,
        },
        required: ['number', 'rank', 'layer', 'reason'],
        propertyOrdering: ['number', 'rank', 'layer', 'reason'],
      },
    },
    raise_candidates: {
      type: Type.ARRAY,
      maxItems: '5',
      items: REASON_ITEM_SCHEMA,
    },
    lower_candidates: {
      type: Type.ARRAY,
      maxItems: '5',
      items: REASON_ITEM_SCHEMA,
    },
    warnings: {
      type: Type.ARRAY,
      maxItems: '5',
      items: SHORT_TEXT,
    },
    final_poc: {
      type: Type.ARRAY,
      maxItems: '5',
      items: {
        type: Type.STRING,
        pattern: '^\\d{4}$',
      },
    },
    debug_notes: {
      type: Type.ARRAY,
      maxItems: '5',
      items: SHORT_TEXT,
    },
  },
  required: [
    'summary',
    'confidence',
    'confidence_percent',
    'main_reading',
    'source_quality',
    'candidate_rank',
    'raise_candidates',
    'lower_candidates',
    'warnings',
    'final_poc',
    'debug_notes',
  ],
  propertyOrdering: [
    'summary',
    'confidence',
    'confidence_percent',
    'main_reading',
    'source_quality',
    'candidate_rank',
    'raise_candidates',
    'lower_candidates',
    'warnings',
    'final_poc',
    'debug_notes',
  ],
}

function getApiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
}

function getAiClient() {
  if (aiClient) {
    return aiClient
  }

  const apiKey = getApiKey()
  if (!apiKey) {
    throw createAiError('GEMINI_API_KEY or GOOGLE_API_KEY is required', 'missing_api_key', 500)
  }

  aiClient = new GoogleGenAI({ apiKey })
  return aiClient
}

function getModelName() {
  return process.env.GEMINI_MODEL || 'gemini-2.5-flash'
}

function getAnalyzeMaxOutputTokens() {
  const value = Number(process.env.GEMINI_ANALYZE_MAX_OUTPUT_TOKENS || 8192)
  return Number.isFinite(value) && value > 0 ? value : 8192
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function isRetryableGeminiError(error) {
  const message = String(error?.message || error || '')
  return error?.status === 503
    || error?.code === 503
    || /"code"\s*:\s*503/.test(message)
    || /UNAVAILABLE|high demand|fetch failed/i.test(message)
}

function parseJsonText(text) {
  return JSON.parse(text)
}

function extractJsonObject(text) {
  const value = String(text || '').trim()
  const first = value.indexOf('{')
  const last = value.lastIndexOf('}')

  if (first === -1 || last === -1 || last <= first) {
    return null
  }

  return value.slice(first, last + 1)
}

function parseAiJson(rawText) {
  try {
    return parseJsonText(rawText)
  } catch (_error) {
    const extracted = extractJsonObject(rawText)
    if (!extracted) {
      return null
    }

    try {
      return parseJsonText(extracted)
    } catch (_secondError) {
      return null
    }
  }
}

async function responseText(response) {
  if (typeof response?.text === 'string') {
    return response.text
  }

  if (typeof response?.text === 'function') {
    return await response.text()
  }

  return String(response || '')
}

export async function generateDevelopmentText(prompt) {
  const ai = getAiClient()
  const response = await ai.models.generateContent({
    model: getModelName(),
    contents: String(prompt || ''),
    config: {
      temperature: 0.2,
      maxOutputTokens: 1200,
    },
  })

  return await responseText(response)
}

export async function analyzeNex4dCandidates(generateResult) {
  const normalizedGenerateResult = validateGenerateResult(generateResult)
  const ai = getAiClient()
  const userPrompt = buildNex4dAnalystUserPrompt(normalizedGenerateResult)

  let rawText = ''

  try {
    let response = null
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        response = await ai.models.generateContent({
          model: getModelName(),
          contents: userPrompt,
          config: {
            systemInstruction: NEX4D_AI_ANALYST_SYSTEM_PROMPT,
            temperature: 0.2,
            maxOutputTokens: getAnalyzeMaxOutputTokens(),
            responseMimeType: 'application/json',
            responseSchema: NEX4D_ANALYSIS_RESPONSE_SCHEMA,
          },
        })
        break
      } catch (error) {
        if (attempt >= 3 || !isRetryableGeminiError(error)) {
          throw error
        }

        await sleep(600 * attempt)
      }
    }

    rawText = await responseText(response)
  } catch (error) {
    if (error.reason === 'missing_api_key') {
      throw error
    }

    console.error('Gemini analyzeNex4dCandidates failed:', error?.message || error)
    throw createAiError('AI analysis failed', 'gemini_error', 502)
  }

  const parsed = parseAiJson(rawText)
  if (!parsed) {
    console.warn('Gemini analyzeNex4dCandidates returned non-JSON:', String(rawText || '').slice(0, 500))
    return {
      analysis: buildAiFallback(),
      rawText,
      parseFailed: true,
      model: getModelName(),
    }
  }

  return {
    analysis: normalizeAiAnalysis(parsed, normalizedGenerateResult),
    rawText,
    parseFailed: false,
    model: getModelName(),
  }
}
