import { Router } from 'express'
import authenticate from '../middleware/authMiddleware.js'
import { createGeneratedCoverLetter } from '../controllers/coverLetterGenerationController.js'

const router = Router()

router.post('/', authenticate, createGeneratedCoverLetter)

export default router
