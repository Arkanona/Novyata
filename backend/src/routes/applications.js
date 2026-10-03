import { Router } from 'express'
import authenticate from '../middleware/authMiddleware.js'
import aiLimiter from '../middleware/aiRateLimit.js'
import aiRequestGuard from '../middleware/aiRequestGuard.js'
import { addApplicationNote, createApplication, deleteApplication, getApplication, getApplicationDossier, listApplications, updateApplication } from '../controllers/applicationController.js'
import { createFollowup, createThankYou, markFollowupSent, updateFollowup } from '../controllers/applicationFollowupController.js'
import { createInterview, updateInterview } from '../controllers/interviewController.js'
import { createInterviewPreparation } from '../controllers/interviewPreparationController.js'
import { completeInterviewSimulation, createInterviewSimulation } from '../controllers/interviewSimulationController.js'
import { getAdvancedStatistics } from '../controllers/advancedStatisticsController.js'

const router = Router()

router.use(authenticate)
router.get('/', listApplications)
router.get('/advanced-statistics', getAdvancedStatistics)
router.post('/', createApplication)
router.get('/:id', getApplication)
router.get('/:id/dossier', getApplicationDossier)
router.post('/:id/events', addApplicationNote)
router.post('/:id/followups', aiLimiter, aiRequestGuard, createFollowup)
router.post('/:id/thank-you', aiLimiter, aiRequestGuard, createThankYou)
router.patch('/:id/followups/:followupId', updateFollowup)
router.patch('/:id/followups/:followupId/sent', markFollowupSent)
router.post('/:id/interviews', createInterview)
router.post('/:id/interview-preparation', aiLimiter, aiRequestGuard, createInterviewPreparation)
router.post('/:id/interview-simulation', aiLimiter, aiRequestGuard, createInterviewSimulation)
router.patch('/:id/interview-simulations/:sessionId/complete', completeInterviewSimulation)
router.patch('/:id/interviews/:interviewId', updateInterview)
router.patch('/:id', updateApplication)
router.delete('/:id', deleteApplication)

export default router
