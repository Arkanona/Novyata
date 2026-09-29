import { Router } from 'express'
import authenticate from '../middleware/authMiddleware.js'
import { analyzeJob } from '../controllers/jobAnalysisController.js'

const router = Router()
router.post('/', authenticate, analyzeJob)

export default router
