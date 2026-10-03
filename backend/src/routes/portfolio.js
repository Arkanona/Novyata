import { Router } from 'express'
import authenticate from '../middleware/authMiddleware.js'
import { getMyPortfolio, getPublicPortfolio, saveMyPortfolio } from '../controllers/portfolioController.js'

const router = Router()
router.get('/me', authenticate, getMyPortfolio)
router.put('/me', authenticate, saveMyPortfolio)
router.get('/:slug', getPublicPortfolio)
export default router
