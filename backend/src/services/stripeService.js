import Stripe from 'stripe'
import ApiError from '../utils/ApiError.js'

let stripeClient
function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new ApiError(503, 'La facturation n’est pas encore configurée.')
  stripeClient ||= new Stripe(process.env.STRIPE_SECRET_KEY)
  return stripeClient
}
const appUrl = () => (process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '')

export async function createProCheckout(user) {
  if (!process.env.STRIPE_PRICE_PRO) throw new ApiError(503, 'Le plan Pro n’est pas encore configuré.')
  return stripe().checkout.sessions.create({
    mode: 'subscription',
    customer: user.stripe_customer_id || undefined,
    customer_email: user.stripe_customer_id ? undefined : user.email,
    client_reference_id: user.id_user,
    metadata: { userId: user.id_user },
    subscription_data: { metadata: { userId: user.id_user } },
    line_items: [{ price: process.env.STRIPE_PRICE_PRO, quantity: 1 }],
    success_url: `${appUrl()}/parametres?checkout=success`,
    cancel_url: `${appUrl()}/pro?checkout=cancelled`,
  })
}

export async function createCustomerPortal(customerId) {
  if (!customerId) throw new ApiError(400, 'Aucun abonnement Stripe n’est associé à ce compte.')
  return stripe().billingPortal.sessions.create({ customer: customerId, return_url: `${appUrl()}/parametres` })
}

export function verifyWebhook(rawBody, signature) {
  if (!process.env.STRIPE_WEBHOOK_SECRET) throw new ApiError(503, 'Le webhook Stripe n’est pas configuré.')
  try { return stripe().webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET) } catch { throw new ApiError(400, 'Signature Stripe invalide.') }
}

export function retrieveSubscription(subscriptionId) { return stripe().subscriptions.retrieve(subscriptionId) }
