const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const AI_ANALYST_KEY = import.meta.env.VITE_AI_ANALYST_KEY || ''

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    cache: options.cache || 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      ...(options.headers || {}),
    },
  })
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(data?.message || `Request failed (${response.status})`)
  }

  return data || {}
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
  return requestJson(`${API_BASE_URL}/api/analysis`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getCandidateRanking(session, targetDate, limit = 20) {
  const params = new URLSearchParams({
    session,
    targetDate,
    limit: String(limit),
  })

  return requestJson(`${API_BASE_URL}/api/candidate/ranking?${params.toString()}`)
}

export function getCandidatePool(session, targetDate, status = 'accepted', limit = 100) {
  const params = new URLSearchParams({
    session,
    targetDate,
    status,
    limit: String(limit),
  })

  return requestJson(`${API_BASE_URL}/api/candidate?${params.toString()}`)
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
