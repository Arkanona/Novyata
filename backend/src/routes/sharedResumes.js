import { Router } from 'express'
import { getSharedResume } from '../controllers/resumeShareController.js'

const router = Router()
router.get('/:token', getSharedResume)
export default router
