import { Router } from 'express'
import authenticate from '../middleware/authMiddleware.js'
import { createSavedAnswer, deleteSavedAnswer, listSavedAnswers, updateSavedAnswer } from '../controllers/savedAnswerController.js'
const router = Router(); router.use(authenticate); router.get('/', listSavedAnswers); router.post('/', createSavedAnswer); router.patch('/:id', updateSavedAnswer); router.delete('/:id', deleteSavedAnswer); export default router
