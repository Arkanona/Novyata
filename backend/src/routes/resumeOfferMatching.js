import { Router } from 'express'
import authenticate from '../middleware/authMiddleware.js'
import { matchResumesToOfferController } from '../controllers/resumeOfferMatchController.js'

const router = Router()
router.post('/', authenticate, matchResumesToOfferController)

export default router
