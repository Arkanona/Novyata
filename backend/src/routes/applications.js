import { Router } from 'express'
import authenticate from '../middleware/authMiddleware.js'
import { addApplicationNote, createApplication, deleteApplication, getApplication, getApplicationDossier, listApplications, updateApplication } from '../controllers/applicationController.js'
import { createFollowup, createThankYou, markFollowupSent, updateFollowup } from '../controllers/applicationFollowupController.js'
import { createInterview, updateInterview } from '../controllers/interviewController.js'
import { createInterviewPreparation } from '../controllers/interviewPreparationController.js'
import { createInterviewSimulation } from '../controllers/interviewSimulationController.js'

const router = Router()

router.use(authenticate)
router.get('/', listApplications)
router.post('/', createApplication)
router.get('/:id', getApplication)
router.get('/:id/dossier', getApplicationDossier)
router.post('/:id/events', addApplicationNote)
router.post('/:id/followups', createFollowup)
router.post('/:id/thank-you', createThankYou)
router.patch('/:id/followups/:followupId', updateFollowup)
router.patch('/:id/followups/:followupId/sent', markFollowupSent)
router.post('/:id/interviews', createInterview)
router.post('/:id/interview-preparation', createInterviewPreparation)
router.post('/:id/interview-simulation', createInterviewSimulation)
router.patch('/:id/interviews/:interviewId', updateInterview)
router.patch('/:id', updateApplication)
router.delete('/:id', deleteApplication)

export default router
