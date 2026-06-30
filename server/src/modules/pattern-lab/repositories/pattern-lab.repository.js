import {
  CandidatePool,
  CandidateRanking,
  WeeklyStatistic,
} from '../pattern-lab.model.js'

export async function upsertWeeklyStatistic(payload) {
  const result = await WeeklyStatistic.findOneAndUpdate(
    {
      market: payload.market,
      session: payload.session,
      targetDateText: payload.targetDateText,
      historyDepth: payload.historyDepth,
    },
    { $set: payload },
    {
      includeResultMetadata: true,
      new: true,
      upsert: true,
    },
  )

  return result.value || result
}

export async function upsertCandidatePoolRows(rows) {
  const saved = []

  for (const row of rows) {
    const result = await CandidatePool.findOneAndUpdate(
      {
        market: row.market,
        session: row.session,
        targetDateText: row.targetDateText,
        candidate: row.candidate,
      },
      { $set: row },
      {
        includeResultMetadata: true,
        new: true,
        upsert: true,
      },
    )

    saved.push(result.value || result)
  }

  return saved
}

export async function upsertRankingRows(rows) {
  const saved = []

  for (const row of rows) {
    const result = await CandidateRanking.findOneAndUpdate(
      {
        market: row.market,
        session: row.session,
        targetDateText: row.targetDateText,
        candidate: row.candidate,
      },
      { $set: row },
      {
        includeResultMetadata: true,
        new: true,
        upsert: true,
      },
    )

    saved.push(result.value || result)
  }

  return saved
}

export function getLatestStatistics({
  market = 'nex4d',
  session,
  targetDate,
  limit = 20,
}) {
  const query = { market }

  if (session) {
    query.session = session
  }

  if (targetDate) {
    query.targetDateText = targetDate
  }

  return WeeklyStatistic.find(query)
    .sort({ targetDate: -1, updatedAt: -1 })
    .limit(limit)
    .lean()
}

export function getCandidatePool({
  market = 'nex4d',
  session,
  targetDate,
  status,
  limit = 100,
}) {
  const query = { market }

  if (session) {
    query.session = session
  }

  if (targetDate) {
    query.targetDateText = targetDate
  }

  if (status) {
    query.status = status
  }

  return CandidatePool.find(query)
    .sort({ dsv1Score: -1, candidate: 1 })
    .limit(limit)
    .lean()
}

export function getCandidateRanking({
  market = 'nex4d',
  session,
  targetDate,
  limit = 100,
}) {
  const query = { market }

  if (session) {
    query.session = session
  }

  if (targetDate) {
    query.targetDateText = targetDate
  }

  return CandidateRanking.find(query)
    .sort({ rank: 1 })
    .limit(limit)
    .lean()
}
