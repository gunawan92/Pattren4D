import {
  getDrawResults,
  syncAllResults,
  syncDayResults,
  syncNightResults,
} from './draw.service.js'

export async function syncDay(request, response, next) {
  try {
    const result = await syncDayResults()
    response.json({
      message: 'Logic Pattren day results synced',
      ...result,
    })
  } catch (error) {
    next(error)
  }
}

export async function syncNight(request, response, next) {
  try {
    const result = await syncNightResults()
    response.json({
      message: 'Logic Pattren night results synced',
      ...result,
    })
  } catch (error) {
    next(error)
  }
}

export async function syncAll(request, response, next) {
  try {
    const result = await syncAllResults()
    response.json({
      message: 'Logic Pattren day and night results synced',
      ...result,
    })
  } catch (error) {
    next(error)
  }
}

export async function listResults(request, response, next) {
  try {
    const session = request.query.session
    const limit = Math.min(Number(request.query.limit || 50), 200)

    if (session && !['day', 'night'].includes(session)) {
      response.status(400).json({ message: 'session must be day or night' })
      return
    }

    const data = await getDrawResults({
      session,
      limit: Number.isFinite(limit) && limit > 0 ? limit : 50,
    })

    response.json({
      count: data.length,
      data,
    })
  } catch (error) {
    next(error)
  }
}
