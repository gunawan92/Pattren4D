import {
  listAnalysis,
  listCandidates,
  listRankings,
  listStatistics,
  runPatternLabAnalysis,
} from './pattern-lab.service.js'

function responseWithCount(response, data) {
  response.json({
    count: data.length,
    data,
  })
}

export async function analysis(request, response, next) {
  try {
    if (request.method === 'POST') {
      const result = await runPatternLabAnalysis(request.body || {})
      response.json(result)
      return
    }

    responseWithCount(response, await listAnalysis(request.query || {}))
  } catch (error) {
    next(error)
  }
}

export async function candidate(request, response, next) {
  try {
    responseWithCount(response, await listCandidates(request.query || {}))
  } catch (error) {
    next(error)
  }
}

export async function candidateRanking(request, response, next) {
  try {
    responseWithCount(response, await listRankings(request.query || {}))
  } catch (error) {
    next(error)
  }
}

export async function statistics(request, response, next) {
  try {
    responseWithCount(response, await listStatistics(request.query || {}))
  } catch (error) {
    next(error)
  }
}
