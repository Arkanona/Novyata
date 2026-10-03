import { Router } from 'express'
import authenticate from '../middleware/authMiddleware.js'
import aiRequestGuard from '../middleware/aiRequestGuard.js'
import { createExperienceImprovement, createProfessionalSummary, improveResumeSummary } from '../controllers/resumeAiController.js'

const router = Router()
router.use(authenticate)
router.post('/:id/summary', aiRequestGuard, createProfessionalSummary)
router.post('/:id/summary/improve', aiRequestGuard, improveResumeSummary)
router.post('/:id/experiences/:experienceId/improve', aiRequestGuard, createExperienceImprovement)
export default router
