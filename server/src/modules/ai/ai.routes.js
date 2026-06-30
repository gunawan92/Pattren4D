import { Router } from 'express'
import { analyzeCandidates, devChat } from './ai.controller.js'

const router = Router()

router.post('/analyze-candidates', analyzeCandidates)
router.post('/dev-chat', devChat)

export default router
