import { Router } from 'express'
import authenticate from '../middleware/authMiddleware.js'
import aiRequestGuard from '../middleware/aiRequestGuard.js'
import { analyzeJob } from '../controllers/jobAnalysisController.js'

const router = Router()
router.post('/', authenticate, aiRequestGuard, analyzeJob)

export default router
