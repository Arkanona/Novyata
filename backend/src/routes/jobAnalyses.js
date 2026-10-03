import { Router } from 'express'
import authenticate from '../middleware/authMiddleware.js'
import { deleteJobAnalysis, getJobAnalysis, listJobAnalyses } from '../controllers/jobAnalysesController.js'
import { compareSavedOffers } from '../controllers/jobOfferComparisonController.js'

const router = Router()
router.use(authenticate)
router.post('/compare', compareSavedOffers)
router.get('/', listJobAnalyses)
router.get('/:id', getJobAnalysis)
router.delete('/:id', deleteJobAnalysis)

export default router
