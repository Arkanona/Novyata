import { Router } from 'express'
import authenticate from '../middleware/authMiddleware.js'
import { createApplication, deleteApplication, getApplication, listApplications, updateApplication } from '../controllers/applicationController.js'

const router = Router()

router.use(authenticate)
router.get('/', listApplications)
router.post('/', createApplication)
router.get('/:id', getApplication)
router.patch('/:id', updateApplication)
router.delete('/:id', deleteApplication)

export default router
