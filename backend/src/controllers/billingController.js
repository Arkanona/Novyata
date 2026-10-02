import { requireDatabase } from '../config/database.js'
import ApiError from '../utils/ApiError.js'
import { createCustomerPortal, createProCheckout, retrieveSubscription, verifyWebhook } from '../services/stripeService.js'

const activeStatuses = new Set(['active', 'trialing', 'past_due'])
const periodEnd = (subscription) => {
  const value = subscription.current_period_end || subscription.items?.data?.[0]?.current_period_end
  return value ? new Date(value * 1000).toISOString() : null
}

async function userForBilling(database, userId) {
  const result = await database.query('select id_user, email, stripe_customer_id, plan, subscription_status, current_period_end from users where id_user = $1', [userId])
  if (!result.rows[0]) throw new ApiError(401, 'Utilisateur introuvable.')
  return result.rows[0]
}

export async function checkout(req, res, next) {
  try {
    const user = await userForBilling(requireDatabase(), req.auth.sub)
    if (user.plan === 'pro' || activeStatuses.has(user.subscription_status)) throw new ApiError(409, 'Votre compte possède déjà un abonnement Pro. Gérez-le depuis les paramètres.')
    const session = await createProCheckout(user)
    return res.json({ url: session.url })
  } catch (error) { return next(error) }
}
export async function portal(req, res, next) {
  try { const user = await userForBilling(requireDatabase(), req.auth.sub); const session = await createCustomerPortal(user.stripe_customer_id); return res.json({ url: session.url }) } catch (error) { return next(error) }
}

async function syncSubscription(database, subscription, fallbackUserId = null) {
  const userId = subscription.metadata?.userId || fallbackUserId
  if (!userId && !subscription.customer) throw new ApiError(400, 'Webhook Stripe sans compte utilisateur.')
  const isPro = activeStatuses.has(subscription.status)
  const result = await database.query(
    `update users set plan = $1, subscription_status = $2, stripe_customer_id = $3, stripe_subscription_id = $4, current_period_end = $5 where ${userId ? 'id_user = $6' : 'stripe_customer_id = $3'} returning id_user`,
    userId ? [isPro ? 'pro' : 'free', subscription.status, String(subscription.customer), subscription.id, periodEnd(subscription), userId] : [isPro ? 'pro' : 'free', subscription.status, String(subscription.customer), subscription.id, periodEnd(subscription)],
  )
  if (!result.rows[0]) throw new ApiError(400, 'Webhook Stripe sans utilisateur correspondant.')
}

export async function stripeWebhook(req, res, next) {
  let database
  let eventId
  try {
    const event = verifyWebhook(req.body, req.headers['stripe-signature'])
    eventId = event.id
    database = requireDatabase()
    const recorded = await database.query('insert into stripe_webhook_events (stripe_event_id, event_type) values ($1, $2) on conflict do nothing returning stripe_event_id', [event.id, event.type])
    if (!recorded.rows[0]) return res.status(200).json({ received: true, duplicate: true })
    const object = event.data.object
    if (event.type === 'checkout.session.completed' && object.subscription) {
      // The subscription event will complete the canonical sync. Store the customer now.
      await database.query('update users set stripe_customer_id = $1 where id_user = $2', [String(object.customer), object.client_reference_id || object.metadata?.userId])
    }
    if (['customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted'].includes(event.type)) await syncSubscription(database, object)
    if (event.type === 'invoice.payment_failed') await database.query("update users set subscription_status = 'past_due' where stripe_customer_id = $1", [String(object.customer)])
    if (event.type === 'invoice.paid' && object.subscription) await syncSubscription(database, await retrieveSubscription(object.subscription))
    return res.status(200).json({ received: true })
  } catch (error) {
    // A failed synchronization must remain retryable by Stripe. The record is
    // therefore removed only when this invocation inserted it successfully.
    if (database && eventId) await database.query('delete from stripe_webhook_events where stripe_event_id = $1', [eventId]).catch(() => {})
    return next(error)
  }
}
