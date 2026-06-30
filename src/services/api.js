const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const AI_ANALYST_KEY = import.meta.env.VITE_AI_ANALYST_KEY || ''

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || 'Request failed')
  }

  return data
}

export function getLatestResults(session = 'day', limit = 10) {
  const params = new URLSearchParams({
    session,
    limit: String(limit),
  })

  return requestJson(`${API_BASE_URL}/api/draw/results?${params.toString()}`)
}

export function syncDrawResults(mode = 'all') {
  return requestJson(`${API_BASE_URL}/api/draw/sync/${encodeURIComponent(mode)}`, {
    method: 'POST',
  })
}

export function generateAnalysis(payload) {
  return requestJson(`${API_BASE_URL}/api/analyzer/generate`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function evaluateAnalysis(payload) {
  return requestJson(`${API_BASE_URL}/api/analyzer/evaluate`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function checkMistik(number) {
  return requestJson(`${API_BASE_URL}/api/analyzer/mistik/${encodeURIComponent(number)}`)
}

export function analyzeCandidatesWithAi(generateResult) {
  return requestJson(`${API_BASE_URL}/api/ai/analyze-candidates`, {
    method: 'POST',
    headers: AI_ANALYST_KEY ? { 'x-ai-analyst-key': AI_ANALYST_KEY } : {},
    body: JSON.stringify({ generateResult }),
  })
}
