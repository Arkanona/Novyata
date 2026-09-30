import { Router } from 'express'
import authenticate from '../middleware/authMiddleware.js'
import { deleteJobAnalysis, getJobAnalysis, listJobAnalyses } from '../controllers/jobAnalysesController.js'

const router = Router()
router.use(authenticate)
router.get('/', listJobAnalyses)
router.get('/:id', getJobAnalysis)
router.delete('/:id', deleteJobAnalysis)

export default router
