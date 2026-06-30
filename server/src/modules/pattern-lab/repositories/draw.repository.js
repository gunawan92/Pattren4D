import { AnalysisCandidate } from '../../analyzer/analyzer.model.js'
import { DrawResult } from '../../draw/draw.model.js'
import {
  normalize4d,
  normalizeWeightProfile,
  profileFromHistoricalDraws,
  subtractDays,
  toDateText,
} from '../statistics.js'

export async function findDrawByDate({ market = 'nex4d', session, date }) {
  const start = new Date(date)
  start.setUTCHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)

  return DrawResult.findOne({
    market,
    session,
    drawDate: { $gte: start, $lt: end },
  })
    .sort({ drawDate: -1, createdAt: -1 })
    .lean()
}

export async function loadHistoricalDraws({
  market = 'nex4d',
  session,
  targetDate,
  historyDepth,
}) {
  const draws = []

  for (let week = 1; week <= historyDepth; week += 1) {
    const date = subtractDays(targetDate, week * 7)
    const draw = await findDrawByDate({ market, session, date })

    if (draw) {
      draws.push({
        ...draw,
        weekOffset: week,
        normalizedResult: normalize4d(draw.result4d || draw.drawNumber),
      })
    }
  }

  return draws
}

export async function findStoredDsv1Profile({
  market = 'nex4d',
  session,
  targetDateText,
}) {
  const row = await AnalysisCandidate.findOne({
    market,
    session,
    targetDateText,
    'digitPool.weighted': { $exists: true },
  })
    .sort({ updatedAt: -1, createdAt: -1 })
    .lean()

  if (!row?.digitPool?.weighted) {
    return null
  }

  return {
    profile: normalizeWeightProfile(row.digitPool.weighted),
    source: {
      type: 'analysis_candidates.digitPool.weighted',
      analysisCandidateId: row._id,
      algorithmVersion: row.algorithmVersion,
    },
  }
}

export async function resolveDsv1Profile({
  market = 'nex4d',
  session,
  targetDate,
  explicitProfile,
  fallbackDraws,
}) {
  if (explicitProfile && Object.keys(explicitProfile).length) {
    return {
      profile: normalizeWeightProfile(explicitProfile),
      source: { type: 'request' },
    }
  }

  const targetDateText = toDateText(targetDate)
  const stored = await findStoredDsv1Profile({ market, session, targetDateText })

  if (stored) {
    return stored
  }

  return {
    profile: normalizeWeightProfile(profileFromHistoricalDraws(fallbackDraws)),
    source: {
      type: 'historical_draw_frequency_fallback',
      reason: 'No stored DSV1 profile found for target period',
    },
  }
}

export async function resolveHistoricalDsv1Profiles({
  market = 'nex4d',
  session,
  historicalDraws,
}) {
  const profiles = []

  for (const draw of historicalDraws) {
    const dateText = draw.drawDate ? toDateText(new Date(draw.drawDate)) : draw.drawDateText
    const stored = await findStoredDsv1Profile({ market, session, targetDateText: dateText })

    profiles.push({
      drawId: draw._id,
      drawDateText: dateText,
      weekOffset: draw.weekOffset,
      ...(stored || {
        profile: normalizeWeightProfile(profileFromHistoricalDraws(historicalDraws.filter((item) => {
          return item.drawDate && draw.drawDate && new Date(item.drawDate) < new Date(draw.drawDate)
        }))),
        source: {
          type: 'historical_draw_frequency_fallback',
          reason: 'No stored historical DSV1 profile found for this period',
        },
      }),
    })
  }

  return profiles
}
