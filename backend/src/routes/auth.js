import { Router } from 'express'
import { changePassword, deleteAccount, forgotPassword, login, me, register, resendVerification, resetPassword, updateProfile, verifyEmail } from '../controllers/authController.js'
import authenticate from '../middleware/authMiddleware.js'

const router = Router()
router.post('/register', register)
router.post('/login', login)
router.post('/forgot-password', forgotPassword)
router.post('/reset-password', resetPassword)
router.post('/verify-email', verifyEmail)
router.get('/me', authenticate, me)
router.patch('/me', authenticate, updateProfile)
router.patch('/me/password', authenticate, changePassword)
router.post('/me/resend-verification', authenticate, resendVerification)
router.delete('/me', authenticate, deleteAccount)
export default router
