import { Router } from 'express'
import authenticate from '../middleware/authMiddleware.js'
import { applyCvAdaptation, createAdaptationProposals } from '../controllers/cvAdaptationController.js'

const router = Router({ mergeParams: true })
router.use(authenticate)
router.post('/', createAdaptationProposals)
router.post('/apply', applyCvAdaptation)

export default router
