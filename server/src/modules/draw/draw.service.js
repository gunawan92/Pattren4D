import axios from 'axios'
import { normalizeDrawResults } from '../../utils/normalize.js'
import { DrawResult } from './draw.model.js'

function getEndpointForSession(session) {
  if (session === 'day') {
    return {
      key: 'NEX4D_DAY_ENDPOINT',
      sourceUrl: process.env.NEX4D_DAY_ENDPOINT,
    }
  }

  return {
    key: 'NEX4D_NIGHT_ENDPOINT',
    sourceUrl: process.env.NEX4D_NIGHT_ENDPOINT || process.env.NEX4d_NIGHT_ENDPOINT,
  }
}

export async function syncDrawResults(session = 'day') {
  if (!['day', 'night'].includes(session)) {
    const error = new Error('session must be day or night')
    error.statusCode = 400
    throw error
  }

  const { key, sourceUrl } = getEndpointForSession(session)

  if (!sourceUrl) {
    const error = new Error(`${key} is required`)
    error.statusCode = 500
    throw error
  }

  let payload

  try {
    const response = await axios.get(sourceUrl, {
      timeout: 15000,
      headers: {
        accept: 'application/json, text/plain, */*',
        'user-agent': 'Logic-Pattren/0.1',
      },
    })
    payload = response.data
  } catch (error) {
    const upstreamMessage = error.response
      ? `Source endpoint responded with ${error.response.status}`
      : error.message
    const wrapped = new Error(upstreamMessage)
    wrapped.statusCode = 502
    throw wrapped
  }

  const rows = normalizeDrawResults(payload, {
    session,
    sourceUrl,
  })

  let inserted = 0
  let updated = 0
  const saved = []

  for (const row of rows) {
    const result = await DrawResult.findOneAndUpdate(
      {
        market: row.market,
        session: row.session,
        drawDateText: row.drawDateText,
        drawNumber: row.drawNumber,
      },
      {
        $set: row,
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      {
        includeResultMetadata: true,
        new: true,
        upsert: true,
      },
    )

    const document = result.value || result
    saved.push(document)

    if (result.lastErrorObject?.updatedExisting) {
      updated += 1
    } else {
      inserted += 1
    }
  }

  const latest = await DrawResult.find({ market: 'nex4d', session })
    .sort({ drawDate: -1, createdAt: -1 })
    .limit(10)
    .lean()

  return {
    session,
    fetched: rows.length,
    inserted,
    updated,
    latest,
    savedCount: saved.length,
  }
}

export function syncDayResults() {
  return syncDrawResults('day')
}

export function syncNightResults() {
  return syncDrawResults('night')
}

export async function syncAllResults() {
  const day = await syncDrawResults('day')
  const night = await syncDrawResults('night')

  return { day, night }
}

export async function getDrawResults({ session, limit = 50 }) {
  const query = { market: 'nex4d' }

  if (session) {
    query.session = session
  }

  return DrawResult.find(query)
    .sort({ drawDate: -1, createdAt: -1 })
    .limit(limit)
    .lean()
}

export async function findByDateText({ session, dateText }) {
  return DrawResult.findOne({
    market: 'nex4d',
    session,
    drawDateText: dateText,
  })
    .sort({ drawDate: -1, createdAt: -1 })
    .lean()
}

export async function findNearestByDate({ session, date }) {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(end.getDate() + 1)

  return DrawResult.findOne({
    market: 'nex4d',
    session,
    drawDate: {
      $gte: start,
      $lt: end,
    },
  })
    .sort({ drawDate: -1, createdAt: -1 })
    .lean()
}
