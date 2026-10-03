import ApiError from '../utils/ApiError.js'
import { AI_FEATURES, currentUsagePeriod, nextUsageReset, normalizePlan, quotaFor } from '../config/plans.js'
import { assertAiFeatureEnabled } from '../config/ai.js'

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

/** Atomically claims one monthly quota unit. The SQL conflict predicate makes
 * concurrent requests serialize on the unique user/feature/period row. */
export async function reserveAiQuota(database, userId, feature, now = new Date()) {
  if (!validFeatures.has(feature)) throw new ApiError(500, 'Fonction IA inconnue.')
  const userResult = await database.query('select plan from users where id_user = $1', [userId])
  if (!userResult.rows[0]) throw new ApiError(401, 'Utilisateur introuvable.')
  const plan = normalizePlan(userResult.rows[0].plan)
  const limit = quotaFor(plan, feature)
  if (limit <= 0) throw new ApiError(429, 'Cette fonctionnalité IA n’est pas incluse dans votre offre.', { feature, upgrade: true })
  const period = currentUsagePeriod(now)
  const result = await database.query(
    'insert into ai_usage (id_user, feature, period, count) values ($1, $2, $3, 1) on conflict (id_user, feature, period) do update set count = ai_usage.count + 1, updated_at = now() where ai_usage.count < $4 returning count',
    [userId, feature, period, limit],
  )
  if (!result.rows[0]) throw new ApiError(429, 'Vous avez utilisé toutes vos utilisations IA incluses ce mois-ci.', { feature, upgrade: true })
  return { userId, feature, period, plan, limit, count: result.rows[0].count }
}

/** Releases a reservation only when we know no OpenAI request was dispatched. */
export async function releaseAiQuota(database, reservation) {
  if (!reservation) return
  const { userId, feature, period } = reservation
  const decremented = await database.query(
    'update ai_usage set count = count - 1, updated_at = now() where id_user = $1 and feature = $2 and period = $3 and count > 1 returning count',
    [userId, feature, period],
  )
  if (!decremented.rows[0]) {
    await database.query('delete from ai_usage where id_user = $1 and feature = $2 and period = $3 and count = 1', [userId, feature, period])
  }
}

/** Reserves before provider I/O. Once dispatched, all outcomes consume quota
 * because provider billing may have occurred even if the response is unusable. */
export async function runWithAiQuota(database, userId, feature, work, now = new Date()) {
  assertAiFeatureEnabled(feature)
  const reservation = await reserveAiQuota(database, userId, feature, now)
  let requestStarted = false
  try {
    return await work({
      plan: reservation.plan,
      onRequestStart: () => { requestStarted = true },
    })
  } catch (error) {
    if (!requestStarted) await releaseAiQuota(database, reservation)
    throw error
  }
}
