import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const stripeMock = vi.hoisted(() => ({
  pricesRetrieve: vi.fn(), checkoutCreate: vi.fn(), portalCreate: vi.fn(), constructEvent: vi.fn(),
  client: { prices: { retrieve: (...args) => stripeMock.pricesRetrieve(...args) }, checkout: { sessions: { create: (...args) => stripeMock.checkoutCreate(...args) } }, billingPortal: { sessions: { create: (...args) => stripeMock.portalCreate(...args) } }, webhooks: { constructEvent: (...args) => stripeMock.constructEvent(...args) }, subscriptions: { retrieve: vi.fn() } }
}))
vi.mock('stripe', () => ({ default: vi.fn(function StripeMock() { return stripeMock.client }) }))

import { createCustomerPortal, createProCheckout, verifyWebhook } from '../src/services/stripeService.js'

describe('stripeService', () => {
  const prior = { secret: process.env.STRIPE_SECRET_KEY, price: process.env.STRIPE_PRICE_PRO, webhook: process.env.STRIPE_WEBHOOK_SECRET, frontend: process.env.FRONTEND_URL }
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock'
    process.env.STRIPE_PRICE_PRO = 'price_monthly_test'
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_mock'
    process.env.FRONTEND_URL = 'http://localhost:5174'
  })
  afterEach(() => {
    for (const [key, value] of [['STRIPE_SECRET_KEY', prior.secret], ['STRIPE_PRICE_PRO', prior.price], ['STRIPE_WEBHOOK_SECRET', prior.webhook], ['FRONTEND_URL', prior.frontend]]) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  })

  it('creates a monthly subscription Checkout using backend identity and configured price', async () => {
    stripeMock.pricesRetrieve.mockResolvedValue({ active: true, livemode: false, product: { name: 'Novyata Pro' }, type: 'recurring', recurring: { interval: 'month', interval_count: 1 } })
    stripeMock.checkoutCreate.mockResolvedValue({ url: 'https://checkout.stripe.test/session' })
    const user = { id_user: 'user-123', email: 'user@example.com', stripe_customer_id: null }
    await expect(createProCheckout(user)).resolves.toEqual({ url: 'https://checkout.stripe.test/session' })
    expect(stripeMock.pricesRetrieve).toHaveBeenCalledWith('price_monthly_test', { expand: ['product'] })
    expect(stripeMock.checkoutCreate).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'subscription', client_reference_id: 'user-123', metadata: { userId: 'user-123' },
      subscription_data: { metadata: { userId: 'user-123' } }, line_items: [{ price: 'price_monthly_test', quantity: 1 }],
      success_url: 'http://localhost:5174/parametres?checkout=success', cancel_url: 'http://localhost:5174/parametres?checkout=cancelled'
    }))
  })

  it('rejects inactive, one-time or non-monthly configured prices', async () => {
    stripeMock.pricesRetrieve.mockResolvedValue({ active: true, livemode: false, product: { name: 'Novyata Pro' }, type: 'recurring', recurring: { interval: 'year', interval_count: 1 } })
    await expect(createProCheckout({ id_user: 'user-123', email: 'user@example.com' })).rejects.toMatchObject({ statusCode: 503 })
    expect(stripeMock.checkoutCreate).not.toHaveBeenCalled()
  })

  it('refuses live secret keys before contacting Stripe', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_live_must_not_be_used'
    await expect(createProCheckout({ id_user: 'user-123', email: 'user@example.com' })).rejects.toMatchObject({ statusCode: 503 })
    expect(stripeMock.pricesRetrieve).not.toHaveBeenCalled()
  })

  it('creates a portal for the selected Stripe customer', async () => {
    stripeMock.portalCreate.mockResolvedValue({ url: 'https://billing.stripe.test/portal' })
    await createCustomerPortal('cus_test')
    expect(stripeMock.portalCreate).toHaveBeenCalledWith({ customer: 'cus_test', return_url: 'http://localhost:5174/parametres' })
  })

  it('verifies webhook signatures with the configured secret and raw payload', () => {
    const rawBody = Buffer.from('{"id":"evt_1"}')
    stripeMock.constructEvent.mockReturnValue({ id: 'evt_1' })
    expect(verifyWebhook(rawBody, 'stripe-signature')).toEqual({ id: 'evt_1' })
    expect(stripeMock.constructEvent).toHaveBeenCalledWith(rawBody, 'stripe-signature', 'whsec_mock')
  })

  it('does not misreport a live secret as an invalid webhook signature', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_live_not_allowed'
    let error
    try { verifyWebhook(Buffer.from('{}'), 'signature') } catch (caught) { error = caught }
    expect(error).toMatchObject({ statusCode: 503 })
    expect(stripeMock.constructEvent).not.toHaveBeenCalled()
  })
})
