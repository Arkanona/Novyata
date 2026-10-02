import { Router } from 'express'
import authenticate from '../middleware/authMiddleware.js'
import { listActivity } from '../controllers/activityController.js'

const router = Router()
router.use(authenticate)
router.get('/', listActivity)
export default router
