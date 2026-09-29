import { Router } from 'express'
import authenticate from '../middleware/authMiddleware.js'
import { createCoverLetter, deleteCoverLetter, getCoverLetter, listCoverLetters, updateCoverLetter } from '../controllers/coverLetterController.js'

const router = Router()

router.use(authenticate)
router.get('/', listCoverLetters)
router.post('/', createCoverLetter)
router.get('/:id', getCoverLetter)
router.patch('/:id', updateCoverLetter)
router.delete('/:id', deleteCoverLetter)

export default router
