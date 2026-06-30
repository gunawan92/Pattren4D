import { DrawResult } from '../../draw/draw.model.js'
import {
  normalize4d,
  subtractDays,
  toDateText,
} from '../statistics.js'

function slashDateText(date) {
  const day = String(date.getUTCDate()).padStart(2, '0')
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const year = date.getUTCFullYear()

  return `${day}/${month}/${year}`
}

function normalizeDrawDateText(value) {
  const text = String(value || '').trim()

  const isoLike = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/)
  if (isoLike) {
    const [, year, month, day] = isoLike
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const slashLike = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/)
  if (slashLike) {
    const [, day, month, year] = slashLike
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  return ''
}

export async function findDrawByDate({ market = 'nex4d', session, date }) {
  const start = new Date(date)
  start.setUTCHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)

  const targetDateText = toDateText(start)
  const targetSlashDateText = slashDateText(start)
  const draw = await DrawResult.findOne({
    market,
    session,
    drawDateText: { $in: [targetDateText, targetSlashDateText] },
  })
    .sort({ drawDate: -1, createdAt: -1 })
    .lean()

  if (draw) {
    return draw
  }

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

export { normalizeDrawDateText }
