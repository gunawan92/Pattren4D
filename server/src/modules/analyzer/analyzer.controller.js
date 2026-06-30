import { analyzeNightTarget } from './analyzer.service.js'
import { evaluateAnalysis, getEvaluations } from './evaluator.service.js'
import { generateAnalysis, getCandidates } from './analyzer.service.js'
import { getMistik } from './mistik.js'
import { sendAiError } from '../ai/ai.controller.js'
import { getGenerateResultFromBody } from '../ai/ai.schema.js'
import { analyzeNex4dCandidates } from '../ai/gemini.service.js'

export const analisaAi = async (req, res, next) => {
  try {
    const generateResult = getGenerateResultFromBody(req.body?.dataDraw ? req.body.dataDraw : req.body)

    if (!generateResult) {
      res.status(400).json({
        ok: false,
        message: 'generateResult is required before AI analysis',
        reason: 'invalid_payload',
      })
      return
    }

    const result = await analyzeNex4dCandidates(generateResult)

    res.json({
      ok: true,
      model: result.model,
      data: result.analysis,
      meta: {
        parseFailed: result.parseFailed,
      },
    })
  } catch (error) {
    if (error.reason) {
      sendAiError(res, error)
      return
    }

    next(error)
  }
}

export function mistik(request, response, next) {
  try {
    response.json(getMistik(request.params.number))
  } catch (error) {
    next(error)
  }
}

export async function nightTarget(request, response, next) {
  try {
    const result = await analyzeNightTarget(request.body || {})
    response.json(result)
  } catch (error) {
    next(error)
  }
}

export async function generate(request, response, next) {
  try {
    const result = await generateAnalysis(request.body || {})
    response.json(result)
  } catch (error) {
    next(error)
  }
}

export async function candidates(request, response, next) {
  try {
    const limit = Math.min(Number(request.query.limit || 50), 200)
    const data = await getCandidates({
      session: request.query.session,
      targetDate: request.query.targetDate,
      algorithmVersion: request.query.algorithmVersion,
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

export async function evaluate(request, response, next) {
  try {
    const result = await evaluateAnalysis(request.body || {})
    response.json(result)
  } catch (error) {
    next(error)
  }
}

export async function evaluations(request, response, next) {
  try {
    const limit = Math.min(Number(request.query.limit || 10), 200)

    if (request.query.session && !['day', 'night'].includes(request.query.session)) {
      response.status(400).json({ message: 'session must be day or night' })
      return
    }

    const data = await getEvaluations({
      session: request.query.session,
      targetDate: request.query.targetDate,
      algorithmVersion: request.query.algorithmVersion,
      limit: Number.isFinite(limit) && limit > 0 ? limit : 10,
    })

    response.json({
      count: data.length,
      data,
    })
  } catch (error) {
    next(error)
  }
}
