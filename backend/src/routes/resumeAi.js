import { Router } from 'express'
import authenticate from '../middleware/authMiddleware.js'
import { createExperienceImprovement, createProfessionalSummary, improveResumeSummary } from '../controllers/resumeAiController.js'

const router = Router()
router.use(authenticate)
router.post('/:id/summary', createProfessionalSummary)
router.post('/:id/summary/improve', improveResumeSummary)
router.post('/:id/experiences/:experienceId/improve', createExperienceImprovement)
export default router
