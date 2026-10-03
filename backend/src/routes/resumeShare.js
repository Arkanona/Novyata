import { Router } from 'express'
import authenticate from '../middleware/authMiddleware.js'
import { createResumeShareLink, listResumeShareLinks, revokeResumeShareLink } from '../controllers/resumeShareController.js'

const router = Router({ mergeParams: true })
router.use(authenticate)
router.get('/', listResumeShareLinks)
router.post('/', createResumeShareLink)
router.delete('/:linkId', revokeResumeShareLink)
export default router
