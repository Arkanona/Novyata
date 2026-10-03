import { Router } from 'express'
import authenticate from '../middleware/authMiddleware.js'
import aiRequestGuard from '../middleware/aiRequestGuard.js'
import { createGeneratedCoverLetter } from '../controllers/coverLetterGenerationController.js'

const router = Router()

router.post('/', authenticate, aiRequestGuard, createGeneratedCoverLetter)

export default router
