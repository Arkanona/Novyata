import { Router } from 'express'
import authenticate from '../middleware/authMiddleware.js'
import { getWeeklyGoal, saveWeeklyGoal } from '../controllers/weeklyGoalController.js'

const router = Router()
router.use(authenticate)
router.get('/', getWeeklyGoal)
router.put('/', saveWeeklyGoal)
export default router
