import { findNearestByDate } from '../draw/draw.service.js'
import { AnalysisCandidate } from './analyzer.model.js'
import { runAlgorithm } from './algorithms/index.js'
import { applyHeadMiddleTailLayer } from './head-middle-tail.js'
import { getMistik } from './mistik.js'

function parseTargetDate(value) {
  const date = new Date(`${value}T00:00:00.000Z`)

  if (!value || Number.isNaN(date.getTime())) {
    const error = new Error('targetDate must be a valid YYYY-MM-DD date')
    error.statusCode = 400
    throw error
  }

  return date
}

function subtractDays(date, days) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() - days)
  return next
}

function drawPayload(draw) {
  if (!draw) {
    return null
  }

  return {
    id: draw._id,
    drawDate: draw.drawDate,
    drawDateText: draw.drawDateText,
    dayName: draw.dayName,
    eventName: draw.eventName,
    drawNumber: draw.drawNumber,
    result4d: draw.result4d,
  }
}

function buildMissingError(missing) {
  const error = new Error('Required historical data not found')
  error.statusCode = 404
  error.payload = {
    ok: false,
    message: 'Required historical data not found',
    missing,
  }
  return error
}

function shouldUseNightHistory({ session, targetDay, algorithmVersion }) {
  const dayKey = String(targetDay || '').trim().toLowerCase()

  return (
    session === 'night' &&
    (
      (algorithmVersion === 'night_v2' && dayKey === 'kamis') ||
      (algorithmVersion === 'night_v1' && dayKey === 'senin')
    )
  )
}

export async function getTargetInputs({
  session = 'day',
  targetDate,
  targetDay,
  lookupSessionOverride,
}) {
  const date = parseTargetDate(targetDate)
  const previousDayDate = subtractDays(date, 1)
  const sameDayLastWeekDate = subtractDays(date, 7)
  const sameDayTwoWeeksAgoDate = subtractDays(date, 14)
  const sameDayThreeWeeksAgoDate = subtractDays(date, 21)
  const lookupSession = lookupSessionOverride || (session === 'night' ? 'day' : session)

  const previousDay = await findNearestByDate({
    session: lookupSession,
    date: previousDayDate,
  })
  const sameDayLastWeek = await findNearestByDate({
    session: lookupSession,
    date: sameDayLastWeekDate,
  })
  const sameDayTwoWeeksAgo = await findNearestByDate({
    session: lookupSession,
    date: sameDayTwoWeeksAgoDate,
  })
  const sameDayThreeWeeksAgo = await findNearestByDate({
    session: lookupSession,
    date: sameDayThreeWeeksAgoDate,
  })
  const missing = []

  if (!previousDay) {
    missing.push('previousDay')
  }

  if (!sameDayLastWeek) {
    missing.push('sameDayLastWeek')
  }

  if (missing.length) {
    throw buildMissingError(missing)
  }

  const previousDayOriginal = previousDay?.result4d || previousDay?.drawNumber || null
  const sameDayLastWeekOriginal = sameDayLastWeek?.result4d || sameDayLastWeek?.drawNumber || null
  const sameDayTwoWeeksAgoOriginal = sameDayTwoWeeksAgo?.result4d || sameDayTwoWeeksAgo?.drawNumber || null
  const sameDayThreeWeeksAgoOriginal = sameDayThreeWeeksAgo?.result4d || sameDayThreeWeeksAgo?.drawNumber || null
  const previousMistik = previousDayOriginal ? getMistik(previousDayOriginal) : null
  const sameDayMistik = sameDayLastWeekOriginal ? getMistik(sameDayLastWeekOriginal) : null
  const sameDayTwoWeeksAgoMistik = sameDayTwoWeeksAgoOriginal
    ? getMistik(sameDayTwoWeeksAgoOriginal)
    : null
  const sameDayThreeWeeksAgoMistik = sameDayThreeWeeksAgoOriginal
    ? getMistik(sameDayThreeWeeksAgoOriginal)
    : null

  return {
    session,
    lookupSession,
    targetDate,
    targetDay,
    targetDateObject: date,
    previousDay: drawPayload(previousDay),
    sameDayLastWeek: drawPayload(sameDayLastWeek),
    sameDayTwoWeeksAgo: drawPayload(sameDayTwoWeeksAgo),
    sameDayThreeWeeksAgo: drawPayload(sameDayThreeWeeksAgo),
    previousDayOriginal,
    sameDayLastWeekOriginal,
    sameDayTwoWeeksAgoOriginal,
    sameDayThreeWeeksAgoOriginal,
    previousDayMistikLama: previousMistik?.mistikLama || null,
    previousDayMistikBaru: previousMistik?.mistikBaru || null,
    sameDayLastWeekMistikLama: sameDayMistik?.mistikLama || null,
    sameDayLastWeekMistikBaru: sameDayMistik?.mistikBaru || null,
    sameDayTwoWeeksAgoMistikLama: sameDayTwoWeeksAgoMistik?.mistikLama || null,
    sameDayTwoWeeksAgoMistikBaru: sameDayTwoWeeksAgoMistik?.mistikBaru || null,
    sameDayThreeWeeksAgoMistikLama: sameDayThreeWeeksAgoMistik?.mistikLama || null,
    sameDayThreeWeeksAgoMistikBaru: sameDayThreeWeeksAgoMistik?.mistikBaru || null,
  }
}

export async function analyzeNightTarget({ targetDate, targetDay }) {
  return getTargetInputs({ session: 'night', targetDate, targetDay })
}

export async function generateAnalysis({
  session = 'night',
  targetDate,
  targetDay,
  algorithmVersion,
  naturalDigits,
  naturalLabel,
}) {
  if (!['day', 'night'].includes(session)) {
    const error = new Error('session must be day or night')
    error.statusCode = 400
    throw error
  }

  if (!algorithmVersion) {
    const error = new Error('algorithmVersion is required')
    error.statusCode = 400
    throw error
  }

  const context = await getTargetInputs({
    session,
    targetDate,
    targetDay,
    lookupSessionOverride: shouldUseNightHistory({ session, targetDay, algorithmVersion })
      ? 'night'
      : null,
  })
  const baseGenerated = runAlgorithm(algorithmVersion, {
    ...context,
    session,
    naturalDigits,
    naturalLabel,
  })
  const generated = await applyHeadMiddleTailLayer({
    context: {
      ...context,
      session,
    },
    generated: baseGenerated,
  })

  const payload = {
    market: 'nex4d',
    session,
    targetDate: context.targetDateObject,
    targetDateText: targetDate,
    targetDay,
    algorithmVersion,
    ...generated,
  }

  const result = await AnalysisCandidate.findOneAndUpdate(
    {
      market: 'nex4d',
      session,
      targetDateText: targetDate,
      algorithmVersion,
    },
    { $set: payload },
    {
      includeResultMetadata: true,
      new: true,
      upsert: true,
    },
  )

  return {
    ok: true,
    operation: result.lastErrorObject?.updatedExisting ? 'updated' : 'inserted',
    data: result.value || result,
  }
}

export async function getCandidates({
  session,
  targetDate,
  algorithmVersion,
  limit = 50,
}) {
  const query = { market: 'nex4d' }

  if (session) {
    query.session = session
  }

  if (targetDate) {
    query.targetDateText = targetDate
  }

  if (algorithmVersion) {
    query.algorithmVersion = algorithmVersion
  }

  return AnalysisCandidate.find(query)
    .sort({ targetDate: -1, createdAt: -1 })
    .limit(limit)
    .lean()
}
