import { Router } from 'express'
import authenticate from '../middleware/authMiddleware.js'
import { importOfferUrl } from '../controllers/offerUrlController.js'

const router = Router()
router.post('/', authenticate, importOfferUrl)

export default router
