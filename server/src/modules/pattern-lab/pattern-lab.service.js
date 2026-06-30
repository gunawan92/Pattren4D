import { generateCandidatePool } from './candidate-generator.js'
import { rankCandidates } from './ranking.js'
import { generateAnalysis as generateEngineAnalysis } from '../analyzer/analyzer.service.js'
import {
  loadHistoricalDraws,
  normalizeDrawDateText,
} from './repositories/draw.repository.js'
import {
  buildHistoricalPatternAnalysis,
} from './historical-pattern-analyzer.js'
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
  DIGITS,
  normalizeDayName,
  normalizeWeightProfile,
  parseTargetDate,
  toDateText,
} from './statistics.js'
import { validateCandidate } from './validators/index.js'

const DEFAULT_HISTORY_DEPTH = 5
const MAX_HISTORY_DEPTH = 52
const DEFAULT_LIMIT = 100
const PERSISTED_ACCEPTED_LIMIT = 100
const CLUSTER_PERSIST_LIMIT = Math.floor(PERSISTED_ACCEPTED_LIMIT / 3)

function defaultAlgorithmVersion(session) {
  return session === 'day' ? 'day_v1' : 'night_v1'
}

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

function validateDsv1Table(profile) {
  const normalized = normalizeWeightProfile(profile || {})
  const hasAnyValue = DIGITS.some((digit) => Number(normalized[digit]) > 0)

  if (!profile || !Object.keys(profile).length || !hasAnyValue) {
    const error = new Error('Current DSV1 table is required')
    error.statusCode = 400
    error.payload = {
      ok: false,
      message: 'Current DSV1 table is required',
      required: DIGITS,
    }
    throw error
  }

  return normalized
}

async function generateCurrentDsv1Table({
  session,
  targetDate,
  targetDay,
  algorithmVersion,
}) {
  const generated = await generateEngineAnalysis({
    session,
    targetDate,
    targetDay,
    algorithmVersion: algorithmVersion || defaultAlgorithmVersion(session),
  })
  const row = generated.data
  const profile = validateDsv1Table(row?.digitPool?.weighted)

  return {
    profile,
    source: {
      type: 'pattern_lab_engine_generated',
      analysisCandidateId: row?._id,
      algorithmVersion: row?.algorithmVersion,
    },
    engineResult: row,
  }
}

async function generateHistoricalDsv1Snapshots({
  session,
  historicalDraws,
  algorithmVersion,
}) {
  const snapshots = []

  for (const draw of historicalDraws) {
    const drawDateText = normalizeDrawDateText(draw.drawDateText)
      || (draw.drawDate ? toDateText(new Date(draw.drawDate)) : '')
    const generated = await generateEngineAnalysis({
      session,
      targetDate: drawDateText,
      targetDay: normalizeDayName(draw.dayName),
      algorithmVersion: algorithmVersion || defaultAlgorithmVersion(session),
    })
    const row = generated.data
    const profile = validateDsv1Table(row?.digitPool?.weighted)

    snapshots.push({
      drawId: draw._id,
      weekOffset: draw.weekOffset,
      drawDateText,
      result4d: draw.normalizedResult || draw.result4d || draw.drawNumber,
      profile,
      source: {
        type: 'pattern_lab_engine_generated',
        analysisCandidateId: row?._id,
        algorithmVersion: row?.algorithmVersion,
      },
    })
  }

  return snapshots
}

function dsv1Breakdown(number, profile) {
  const digits = String(number || '').replace(/\D/g, '').slice(0, 4).split('')
  const breakdown = digits.map((digit, index) => ({
    position: index + 1,
    digit,
    score: Number(profile[digit] || 0),
  }))

  return {
    breakdown,
    totalScore: breakdown.reduce((total, item) => total + item.score, 0),
  }
}

function buildCandidateRows({
  pool,
  basePayload,
  statistics,
  context,
  patternAnalysis,
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
        patternBand: item.patternBand,
        patternConsistency: 0,
        evidence: {
          scoreRange: statistics.suggestedScoreRange,
          patternEvidence: item.patternEvidence,
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
    const cluster = patternAnalysis.scoreClusters.find((row) => row.band === item.patternBand)
    const patternConsistency = Math.round((cluster?.frequency || 0) * 100)

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
      patternBand: item.patternBand,
      patternConsistency,
      evidence: {
        scoreRange: statistics.suggestedScoreRange,
        historicalFrequency,
        patternEvidence: item.patternEvidence,
      },
    }
  })
}

function selectBalancedCandidateRows(rows, limit = PERSISTED_ACCEPTED_LIMIT) {
  const byBand = ['low', 'medium', 'high'].flatMap((band) => {
    return rows
      .filter((row) => row.patternBand === band)
      .sort((a, b) => {
        const consistencyDiff = b.patternConsistency - a.patternConsistency
        if (consistencyDiff !== 0) {
          return consistencyDiff
        }

        const supportDiff = b.supportScore - a.supportScore
        if (supportDiff !== 0) {
          return supportDiff
        }

        return a.candidate.localeCompare(b.candidate)
      })
      .slice(0, CLUSTER_PERSIST_LIMIT)
  })
  const remainder = rows
    .filter((row) => !byBand.some((selected) => selected.candidate === row.candidate))
    .sort((a, b) => {
      const consistencyDiff = b.patternConsistency - a.patternConsistency
      if (consistencyDiff !== 0) {
        return consistencyDiff
      }

      return b.supportScore - a.supportScore || a.candidate.localeCompare(b.candidate)
    })

  return [...byBand, ...remainder].slice(0, limit)
}

export async function runPatternLabAnalysis({
  market = 'nex4d',
  session = 'night',
  targetDate,
  targetDay,
  historyDepth,
  algorithmVersion,
} = {}) {
  validateSession(session)

  const targetDateObject = parseTargetDate(targetDate)
  const targetDateText = toDateText(targetDateObject)
  const normalizedTargetDay = normalizeDayName(targetDay) || dayNameFromDate(targetDateObject)
  const depth = parseHistoryDepth(historyDepth)
  const currentDsv1 = await generateCurrentDsv1Table({
    session,
    targetDate: targetDateText,
    targetDay: normalizedTargetDay,
    algorithmVersion,
  })
  const currentProfile = currentDsv1.profile
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

  const historicalSnapshots = await generateHistoricalDsv1Snapshots({
    session,
    historicalDraws,
    algorithmVersion,
  })
  const historyWithDsv1 = historicalDraws.map((draw) => {
    const result4d = draw.normalizedResult || draw.result4d || draw.drawNumber
    const snapshot = historicalSnapshots.find((item) => String(item.drawId) === String(draw._id))
    const calculation = dsv1Breakdown(result4d, snapshot?.profile || currentProfile)

    return {
      ...drawEvidence(draw),
      dsv1Snapshot: snapshot?.profile || {},
      dsv1Source: snapshot?.source || {},
      dsv1Breakdown: calculation.breakdown,
      totalScore: calculation.totalScore,
    }
  })
  const historicalScores = historyWithDsv1.map((draw) => draw.totalScore)
  const statistics = calculateScoreStatistics(historicalScores)
  const patternAnalysis = buildHistoricalPatternAnalysis({
    snapshots: historicalSnapshots,
    scores: historicalScores,
  })

  const weeklyStatistic = await upsertWeeklyStatistic({
    market,
    session,
    targetDate: targetDateObject,
    targetDateText,
    targetDay: normalizedTargetDay,
    historyDepth: depth,
    history: historyWithDsv1,
    dsv1Profiles: historicalSnapshots.map((snapshot) => ({
      drawId: snapshot.drawId,
      drawDateText: snapshot.drawDateText,
      weekOffset: snapshot.weekOffset,
      profile: snapshot.profile,
      source: snapshot.source,
    })),
    scores: historicalScores,
    statistics,
    suggestedScoreRange: statistics.suggestedScoreRange,
    currentWeightProfile: currentProfile,
    source: {
      currentWeightProfile: currentDsv1.source,
    },
    engineAnalysis: currentDsv1.engineResult,
    patternAnalysis,
  })

  const basePayload = {
    market,
    session,
    targetDateText,
    targetDay: normalizedTargetDay,
    statisticsId: weeklyStatistic._id,
  }
  const rawPool = generateCandidatePool({
    currentWeightProfile: currentProfile,
    suggestedScoreRange: statistics.suggestedScoreRange,
    patternAnalysis,
  })
  const candidateRows = buildCandidateRows({
    pool: rawPool,
    basePayload,
    statistics,
    patternAnalysis,
    context: {
      historicalDraws,
      currentWeightProfile: currentProfile,
      patternAnalysis,
    },
  })
  const acceptedCandidateRows = candidateRows.filter((row) => row.status === 'accepted')
  const persistedCandidateRows = selectBalancedCandidateRows(acceptedCandidateRows)
  const savedPool = await upsertCandidatePoolRows(persistedCandidateRows, basePayload)
  const savedPoolRows = savedPool.map((row) => (typeof row.toObject === 'function' ? row.toObject() : row))
  const rankedRows = rankCandidates(savedPoolRows, patternAnalysis).map((row) => ({
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
    patternBand: row.patternBand,
    patternConsistency: row.patternConsistency,
    finalScore: row.finalScore,
    validationResults: row.validationResults,
    reason: row.reason,
    evidence: row.evidence,
  }))
  const savedRanking = await upsertRankingRows(rankedRows, basePayload)

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
