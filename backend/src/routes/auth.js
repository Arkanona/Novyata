import { Router } from 'express'
import { changePassword, deleteAccount, login, me, register, updateProfile } from '../controllers/authController.js'
import authenticate from '../middleware/authMiddleware.js'

const router = Router()
router.post('/register', register)
router.post('/login', login)
router.get('/me', authenticate, me)
router.patch('/me', authenticate, updateProfile)
router.patch('/me/password', authenticate, changePassword)
router.delete('/me', authenticate, deleteAccount)

export default router
