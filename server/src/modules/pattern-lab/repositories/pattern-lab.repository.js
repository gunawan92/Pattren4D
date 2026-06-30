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

export async function upsertCandidatePoolRows(rows, scope = rows[0]) {
  await CandidatePool.deleteMany({
    market: scope.market,
    session: scope.session,
    targetDateText: scope.targetDateText,
  })

  if (!rows.length) {
    return []
  }

  await CandidatePool.bulkWrite(
    rows.map((row) => ({
      updateOne: {
        filter: {
          market: row.market,
          session: row.session,
          targetDateText: row.targetDateText,
          candidate: row.candidate,
        },
        update: { $set: row },
        upsert: true,
      },
    })),
    { ordered: false },
  )

  return CandidatePool.find({
    market: scope.market,
    session: scope.session,
    targetDateText: scope.targetDateText,
    candidate: { $in: rows.map((row) => row.candidate) },
  })
}

export async function upsertRankingRows(rows, scope = rows[0]) {
  await CandidateRanking.deleteMany({
    market: scope.market,
    session: scope.session,
    targetDateText: scope.targetDateText,
  })

  if (!rows.length) {
    return []
  }

  await CandidateRanking.bulkWrite(
    rows.map((row) => ({
      updateOne: {
        filter: {
          market: row.market,
          session: row.session,
          targetDateText: row.targetDateText,
          candidate: row.candidate,
        },
        update: { $set: row },
        upsert: true,
      },
    })),
    { ordered: false },
  )

  return CandidateRanking.find({
    market: scope.market,
    session: scope.session,
    targetDateText: scope.targetDateText,
    candidate: { $in: rows.map((row) => row.candidate) },
  })
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
