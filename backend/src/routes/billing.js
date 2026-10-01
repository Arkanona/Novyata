import { Router } from 'express'
import authenticate from '../middleware/authMiddleware.js'
import { checkout, portal } from '../controllers/billingController.js'
const router = Router()
router.post('/checkout', authenticate, checkout)
router.post('/portal', authenticate, portal)
export default router
