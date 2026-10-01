import { requireDatabase } from '../config/database.js'
import { getAiUsage } from '../services/aiUsageService.js'

export async function getUsage(req, res, next) {
  try { return res.json({ usage: await getAiUsage(requireDatabase(), req.auth.sub) }) } catch (error) { return next(error) }
}
