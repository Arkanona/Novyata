import { Router } from 'express'
import authenticate from '../middleware/authMiddleware.js'
import { archiveAllNotifications, archiveNotification, createNextActionNotification, deleteNotification, listNotifications, markAllNotificationsRead, setNotificationRead } from '../controllers/notificationController.js'

const router = Router()
router.use(authenticate)
router.get('/', listNotifications)
router.post('/', createNextActionNotification)
router.patch('/read-all', markAllNotificationsRead)
router.patch('/archive-all', archiveAllNotifications)
router.patch('/:id/read', setNotificationRead)
router.patch('/:id/archive', archiveNotification)
router.delete('/:id', deleteNotification)
export default router
