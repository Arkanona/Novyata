import { Router } from 'express'
import authenticate from '../middleware/authMiddleware.js'
import { getUsage } from '../controllers/usageController.js'

const router = Router()
router.get('/', authenticate, getUsage)
export default router
