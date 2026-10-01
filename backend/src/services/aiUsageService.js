import ApiError from '../utils/ApiError.js'
import { AI_FEATURES, currentUsagePeriod, nextUsageReset, normalizePlan, quotaFor } from '../config/plans.js'

const validFeatures = new Set(Object.values(AI_FEATURES))

export async function getAiUsage(database, userId, now = new Date()) {
  const period = currentUsagePeriod(now)
  const userResult = await database.query('select plan from users where id_user = $1', [userId])
  if (!userResult.rows[0]) throw new ApiError(401, 'Utilisateur introuvable.')
  const plan = normalizePlan(userResult.rows[0].plan)
  const usageResult = await database.query('select feature, count from ai_usage where id_user = $1 and period = $2', [userId, period])
  const counts = new Map(usageResult.rows.map((row) => [row.feature, row.count]))
  const features = Object.values(AI_FEATURES).map((feature) => ({ feature, used: counts.get(feature) || 0, limit: quotaFor(plan, feature), remaining: Math.max(0, quotaFor(plan, feature) - (counts.get(feature) || 0)) }))
  return { plan, period, resets_at: nextUsageReset(now), features }
}

export async function assertAiQuota(database, userId, feature, now = new Date()) {
  if (!validFeatures.has(feature)) throw new ApiError(500, 'Fonction IA inconnue.')
  const usage = await getAiUsage(database, userId, now)
  const current = usage.features.find((item) => item.feature === feature)
  if (!current || current.remaining <= 0) throw new ApiError(429, 'Vous avez utilisé toutes vos utilisations IA incluses ce mois-ci.', { feature, upgrade: true })
  return usage
}

export async function consumeAiQuota(database, userId, feature, now = new Date()) {
  const period = currentUsagePeriod(now)
  await database.query('insert into ai_usage (id_user, feature, period, count) values ($1, $2, $3, 1) on conflict (id_user, feature, period) do update set count = ai_usage.count + 1, updated_at = now()', [userId, feature, period])
}
