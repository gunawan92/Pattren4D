import { generateCandidatePool } from './candidate-generator.js'
import { rankCandidates } from './ranking.js'
import {
  loadHistoricalDraws,
  resolveDsv1Profile,
  resolveHistoricalDsv1Profiles,
} from './repositories/draw.repository.js'
import {
  getCandidatePool,
  getCandidateRanking,
  getLatestStatistics,
  upsertCandidatePoolRows,
  upsertRankingRows,
  upsertWeeklyStatistic,
} from './repositories/pattern-lab.repository.js'
import {
  calculateScoreStatistics,
  dayNameFromDate,
  digitFrequency,
  normalizeDayName,
  parseTargetDate,
  scoreNumber,
  toDateText,
} from './statistics.js'
import { validateCandidate } from './validators/index.js'

const DEFAULT_HISTORY_DEPTH = 5
const MAX_HISTORY_DEPTH = 52
const DEFAULT_LIMIT = 100

function parseLimit(value, fallback = DEFAULT_LIMIT) {
  const limit = Number(value || fallback)
  return Number.isFinite(limit) && limit > 0 ? Math.min(limit, 500) : fallback
}

function parseHistoryDepth(value) {
  const depth = Number(value || DEFAULT_HISTORY_DEPTH)
  return Number.isFinite(depth) && depth > 0
    ? Math.min(Math.floor(depth), MAX_HISTORY_DEPTH)
    : DEFAULT_HISTORY_DEPTH
}

function validateSession(session) {
  if (!['day', 'night'].includes(session)) {
    const error = new Error('session must be day or night')
    error.statusCode = 400
    throw error
  }
}

function drawEvidence(draw) {
  return {
    id: draw._id,
    weekOffset: draw.weekOffset,
    drawDate: draw.drawDate,
    drawDateText: draw.drawDateText,
    dayName: draw.dayName,
    drawNumber: draw.drawNumber,
    result4d: draw.normalizedResult || draw.result4d,
  }
}

function buildCandidateRows({
  pool,
  basePayload,
  statistics,
  context,
}) {
  const historicalFrequency = digitFrequency(context.historicalDraws)

  return pool.map((item) => {
    if (item.status === 'rejected') {
      return {
        ...basePayload,
        candidate: item.candidate,
        dsv1Score: item.dsv1Score,
        scoreRange: statistics.suggestedScoreRange,
        status: item.status,
        rejectionReason: item.rejectionReason,
        validationResults: [],
        supportScore: 0,
        historicalWeight: 0,
        frequencyWeight: 0,
        evidence: {
          scoreRange: statistics.suggestedScoreRange,
        },
      }
    }

    const validation = validateCandidate(item.candidate, context)
    const candidateDigits = item.candidate.split('')
    const historicalWeight = validation.validationResults
      .find((row) => row.module === 'historical_weekly_support')
      ?.supportScore || 0
    const frequencyWeight = candidateDigits.reduce((total, digit) => {
      return total + (historicalFrequency[digit] || 0)
    }, 0)

    return {
      ...basePayload,
      candidate: item.candidate,
      dsv1Score: item.dsv1Score,
      scoreRange: statistics.suggestedScoreRange,
      status: item.status,
      rejectionReason: '',
      validationResults: validation.validationResults,
      supportScore: validation.supportScore,
      historicalWeight,
      frequencyWeight,
      evidence: {
        scoreRange: statistics.suggestedScoreRange,
        historicalFrequency,
      },
    }
  })
}

export async function runPatternLabAnalysis({
  market = 'nex4d',
  session = 'night',
  targetDate,
  targetDay,
  historyDepth,
  currentWeightProfile,
} = {}) {
  validateSession(session)

  const targetDateObject = parseTargetDate(targetDate)
  const targetDateText = toDateText(targetDateObject)
  const normalizedTargetDay = normalizeDayName(targetDay) || dayNameFromDate(targetDateObject)
  const depth = parseHistoryDepth(historyDepth)
  const historicalDraws = await loadHistoricalDraws({
    market,
    session,
    targetDate: targetDateObject,
    historyDepth: depth,
  })

  if (!historicalDraws.length) {
    const error = new Error('Historical draws not found for selected day')
    error.statusCode = 404
    error.payload = {
      ok: false,
      message: 'Historical draws not found for selected day',
      requiredHistoryDepth: depth,
    }
    throw error
  }

  const historicalProfiles = await resolveHistoricalDsv1Profiles({
    market,
    session,
    historicalDraws,
  })
  const historicalScores = historicalDraws.map((draw) => {
    const profile = historicalProfiles.find((item) => String(item.drawId) === String(draw._id))
    return scoreNumber(draw.normalizedResult || draw.result4d || draw.drawNumber, profile?.profile || {})
  })
  const statistics = calculateScoreStatistics(historicalScores)
  const currentProfile = await resolveDsv1Profile({
    market,
    session,
    targetDate: targetDateObject,
    explicitProfile: currentWeightProfile,
    fallbackDraws: historicalDraws,
  })

  const weeklyStatistic = await upsertWeeklyStatistic({
    market,
    session,
    targetDate: targetDateObject,
    targetDateText,
    targetDay: normalizedTargetDay,
    historyDepth: depth,
    history: historicalDraws.map(drawEvidence),
    dsv1Profiles: historicalProfiles.map((item) => ({
      drawId: item.drawId,
      drawDateText: item.drawDateText,
      weekOffset: item.weekOffset,
      profile: item.profile,
      source: item.source,
    })),
    scores: historicalScores,
    statistics,
    suggestedScoreRange: statistics.suggestedScoreRange,
    currentWeightProfile: currentProfile.profile,
    source: {
      currentWeightProfile: currentProfile.source,
    },
  })

  const basePayload = {
    market,
    session,
    targetDateText,
    targetDay: normalizedTargetDay,
    statisticsId: weeklyStatistic._id,
  }
  const rawPool = generateCandidatePool({
    currentWeightProfile: currentProfile.profile,
    suggestedScoreRange: statistics.suggestedScoreRange,
  })
  const candidateRows = buildCandidateRows({
    pool: rawPool,
    basePayload,
    statistics,
    context: {
      historicalDraws,
      currentWeightProfile: currentProfile.profile,
    },
  })
  const savedPool = await upsertCandidatePoolRows(candidateRows)
  const savedPoolRows = savedPool.map((row) => (typeof row.toObject === 'function' ? row.toObject() : row))
  const rankedRows = rankCandidates(savedPoolRows).map((row) => ({
    market: row.market,
    session: row.session,
    targetDateText: row.targetDateText,
    targetDay: row.targetDay,
    statisticsId: row.statisticsId,
    candidatePoolId: row._id,
    candidate: row.candidate,
    rank: row.rank,
    rankLabel: row.rankLabel,
    dsv1Score: row.dsv1Score,
    supportScore: row.supportScore,
    historicalWeight: row.historicalWeight,
    frequencyWeight: row.frequencyWeight,
    finalScore: row.finalScore,
    validationResults: row.validationResults,
    reason: row.reason,
    evidence: row.evidence,
  }))
  const savedRanking = await upsertRankingRows(rankedRows)

  return {
    ok: true,
    data: {
      analysis: weeklyStatistic,
      generated: {
        total: rawPool.length,
        accepted: candidateRows.filter((row) => row.status === 'accepted').length,
        rejected: candidateRows.filter((row) => row.status === 'rejected').length,
      },
      topCandidates: savedRanking
        .sort((a, b) => a.rank - b.rank)
        .slice(0, 20),
    },
  }
}

export async function listAnalysis(query = {}) {
  return getLatestStatistics({
    session: query.session,
    targetDate: query.targetDate,
    limit: parseLimit(query.limit, 20),
  })
}

export async function listCandidates(query = {}) {
  return getCandidatePool({
    session: query.session,
    targetDate: query.targetDate,
    status: query.status,
    limit: parseLimit(query.limit),
  })
}

export async function listRankings(query = {}) {
  return getCandidateRanking({
    session: query.session,
    targetDate: query.targetDate,
    limit: parseLimit(query.limit),
  })
}

export async function listStatistics(query = {}) {
  return listAnalysis(query)
}
