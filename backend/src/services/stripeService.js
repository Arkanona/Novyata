import Stripe from 'stripe'
import ApiError from '../utils/ApiError.js'

let stripeClient
function stripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) throw new ApiError(503, 'La facturation n’est pas encore configurée.')
  if (!/^(sk|rk)_test_/.test(secretKey)) throw new ApiError(503, 'Novyata est configuré pour le mode test Stripe uniquement.')
  stripeClient ||= new Stripe(process.env.STRIPE_SECRET_KEY)
  return stripeClient
}
const appUrl = () => (process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:5174').replace(/\/$/, '')

export async function createProCheckout(user) {
  if (!process.env.STRIPE_PRICE_PRO) throw new ApiError(503, 'Le plan Pro n’est pas encore configuré.')
  const price = await stripe().prices.retrieve(process.env.STRIPE_PRICE_PRO, { expand: ['product'] })
  const productName = typeof price.product === 'object' ? price.product?.name : null
  if (!price.active || price.livemode !== false || productName !== 'Novyata Pro' || price.type !== 'recurring' || price.recurring?.interval !== 'month' || price.recurring?.interval_count !== 1) {
    throw new ApiError(503, 'Configurez un prix test actif, mensuel et récurrent sur le produit Novyata Pro.')
  }
  return stripe().checkout.sessions.create({
    mode: 'subscription',
    customer: user.stripe_customer_id || undefined,
    customer_email: user.stripe_customer_id ? undefined : user.email,
    client_reference_id: user.id_user,
    metadata: { userId: user.id_user },
    subscription_data: { metadata: { userId: user.id_user } },
    line_items: [{ price: process.env.STRIPE_PRICE_PRO, quantity: 1 }],
    success_url: `${appUrl()}/parametres?checkout=success`,
    cancel_url: `${appUrl()}/parametres?checkout=cancelled`,
  })
}

export async function createCustomerPortal(customerId) {
  if (!customerId) throw new ApiError(400, 'Aucun abonnement Stripe n’est associé à ce compte.')
  return stripe().billingPortal.sessions.create({ customer: customerId, return_url: `${appUrl()}/parametres` })
}

export function verifyWebhook(rawBody, signature) {
  if (!process.env.STRIPE_WEBHOOK_SECRET) throw new ApiError(503, 'Le webhook Stripe n’est pas configuré.')
  try { return stripe().webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET) } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(400, 'Signature Stripe invalide.')
  }
}

export function retrieveSubscription(subscriptionId) { return stripe().subscriptions.retrieve(subscriptionId) }
