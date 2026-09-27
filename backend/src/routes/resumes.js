import { Router } from 'express'
import authenticate from '../middleware/authMiddleware.js'
import { createResume, getResume, listResumes } from '../controllers/resumeController.js'

const router = Router()
router.use(authenticate)
router.get('/', listResumes)
router.post('/', createResume)
router.get('/:id', getResume)

export default router
