import { Router } from 'express'
import authenticate from '../middleware/authMiddleware.js'
import aiRequestGuard from '../middleware/aiRequestGuard.js'
import { applyCvAdaptation, createAdaptationProposals } from '../controllers/cvAdaptationController.js'

const router = Router({ mergeParams: true })
router.use(authenticate)
router.post('/', aiRequestGuard, createAdaptationProposals)
router.post('/apply', applyCvAdaptation)

export default router
