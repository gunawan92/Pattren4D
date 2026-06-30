import { Router } from 'express'
import {
  analisaAi,
  candidates,
  evaluate,
  evaluations,
  generate,
  mistik,
  nightTarget,
} from '../modules/analyzer/analyzer.controller.js'
import aiRoutes from '../modules/ai/ai.routes.js'
import { devChat } from '../modules/ai/ai.controller.js'
import { listResults, syncAll, syncDay, syncNight } from '../modules/draw/draw.controller.js'
import {
  analysis,
  candidate,
  candidateRanking,
  statistics,
} from '../modules/pattern-lab/pattern-lab.controller.js'

const router = Router()

router.post('/draw/sync/day', syncDay)
router.post('/draw/sync/night', syncNight)
router.post('/draw/sync/all', syncAll)
router.get('/draw/results', listResults)
router.get('/analyzer/mistik/:number', mistik)
router.post('/analyzer/night-target', nightTarget)
router.post('/analyzer/generate', generate)
router.get('/analyzer/candidates', candidates)
router.post('/analyzer/evaluate', evaluate)
router.get('/analyzer/evaluations', evaluations)
router.post('/analyzer/analisa-ai', analisaAi)
router.get('/analysis', analysis)
router.post('/analysis', analysis)
router.get('/candidate', candidate)
router.get('/candidate/ranking', candidateRanking)
router.get('/statistics', statistics)
router.use('/ai', aiRoutes)
router.post('/chat', devChat)


export default router
