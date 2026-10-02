import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createResponse } from './helpers.js'

vi.mock('../src/config/database.js', () => ({ requireDatabase: vi.fn() }))
vi.mock('../src/services/stripeService.js', () => ({ createCustomerPortal: vi.fn(), createProCheckout: vi.fn(), retrieveSubscription: vi.fn(), verifyWebhook: vi.fn() }))

import { requireDatabase } from '../src/config/database.js'
import { createCustomerPortal, createProCheckout, retrieveSubscription, verifyWebhook } from '../src/services/stripeService.js'
import { checkout, portal, stripeWebhook } from '../src/controllers/billingController.js'

const user = { id_user: '8b74e3e1-64b4-46f1-bfd8-c50a174cf908', email: 'marie@example.com', stripe_customer_id: 'cus_1', plan: 'free', subscription_status: 'free' }
const activeSubscription = { id: 'sub_1', customer: 'cus_1', status: 'active', current_period_end: 1780000000, metadata: { userId: user.id_user } }

describe('billing controller', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates Checkout for the authenticated Free account', async () => {
    const database = { query: vi.fn().mockResolvedValue({ rows: [user] }) }
    requireDatabase.mockReturnValue(database)
    createProCheckout.mockResolvedValue({ url: 'https://checkout.stripe.test/session' })
    const res = createResponse()
    await checkout({ auth: { sub: user.id_user } }, res, vi.fn())
    expect(database.query.mock.calls[0][1]).toEqual([user.id_user])
    expect(createProCheckout).toHaveBeenCalledWith(user)
    expect(res.json).toHaveBeenCalledWith({ url: 'https://checkout.stripe.test/session' })
  })

  it('does not create a second Checkout for an active Pro account', async () => {
    requireDatabase.mockReturnValue({ query: vi.fn().mockResolvedValue({ rows: [{ ...user, plan: 'pro', subscription_status: 'active' }] }) })
    const next = vi.fn()
    await checkout({ auth: { sub: user.id_user } }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 409 })
    expect(createProCheckout).not.toHaveBeenCalled()
  })

  it('creates a customer portal session for the account customer', async () => {
    requireDatabase.mockReturnValue({ query: vi.fn().mockResolvedValue({ rows: [user] }) })
    createCustomerPortal.mockResolvedValue({ url: 'https://billing.stripe.test/portal' })
    const res = createResponse()
    await portal({ auth: { sub: user.id_user } }, res, vi.fn())
    expect(createCustomerPortal).toHaveBeenCalledWith('cus_1')
    expect(res.json).toHaveBeenCalledWith({ url: 'https://billing.stripe.test/portal' })
  })

  it('returns the service error if no Stripe customer exists for the portal', async () => {
    requireDatabase.mockReturnValue({ query: vi.fn().mockResolvedValue({ rows: [{ ...user, stripe_customer_id: null }] }) })
    createCustomerPortal.mockRejectedValueOnce(Object.assign(new Error('Aucun abonnement Stripe n’est associé.'), { statusCode: 400 }))
    const next = vi.fn()
    await portal({ auth: { sub: user.id_user } }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 400 })
  })

  it('rejects an invalid webhook signature without touching the database', async () => {
    const rawBody = Buffer.from('{"type":"customer.subscription.updated"}')
    verifyWebhook.mockImplementation(() => { throw Object.assign(new Error('invalid'), { statusCode: 400 }) })
    const next = vi.fn()
    await stripeWebhook({ body: rawBody, headers: { 'stripe-signature': 'bad' } }, createResponse(), next)
    expect(verifyWebhook).toHaveBeenCalledWith(rawBody, 'bad')
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 400 })
    expect(requireDatabase).not.toHaveBeenCalled()
  })

  it('activates Pro only from a valid subscription webhook', async () => {
    verifyWebhook.mockReturnValue({ id: 'evt_active', type: 'customer.subscription.updated', data: { object: activeSubscription } })
    const database = { query: vi.fn().mockResolvedValueOnce({ rows: [{ stripe_event_id: 'evt_active' }] }).mockResolvedValueOnce({ rows: [{ id_user: user.id_user }] }) }
    requireDatabase.mockReturnValue(database)
    const res = createResponse()
    await stripeWebhook({ body: Buffer.from('{}'), headers: { 'stripe-signature': 'sig' } }, res, vi.fn())
    expect(database.query.mock.calls[1][1]).toEqual(['pro', 'active', 'cus_1', 'sub_1', expect.any(String), user.id_user])
    expect(res.status).toHaveBeenCalledWith(200)
  })

  it('returns a canceled subscription to Free', async () => {
    verifyWebhook.mockReturnValue({ id: 'evt_deleted', type: 'customer.subscription.deleted', data: { object: { ...activeSubscription, status: 'canceled' } } })
    const database = { query: vi.fn().mockResolvedValueOnce({ rows: [{ stripe_event_id: 'evt_deleted' }] }).mockResolvedValueOnce({ rows: [{ id_user: user.id_user }] }) }
    requireDatabase.mockReturnValue(database)
    await stripeWebhook({ body: Buffer.from('{}'), headers: {} }, createResponse(), vi.fn())
    expect(database.query.mock.calls[1][1].slice(0, 4)).toEqual(['free', 'canceled', 'cus_1', 'sub_1'])
  })

  it('keeps Pro through period-end cancellation while Stripe still reports active', async () => {
    verifyWebhook.mockReturnValue({ id: 'evt_period_end', type: 'customer.subscription.updated', data: { object: { ...activeSubscription, cancel_at_period_end: true } } })
    const database = { query: vi.fn().mockResolvedValueOnce({ rows: [{ stripe_event_id: 'evt_period_end' }] }).mockResolvedValueOnce({ rows: [{ id_user: user.id_user }] }) }
    requireDatabase.mockReturnValue(database)
    await stripeWebhook({ body: Buffer.from('{}'), headers: {} }, createResponse(), vi.fn())
    expect(database.query.mock.calls[1][1][0]).toBe('pro')
    expect(database.query.mock.calls[1][1][1]).toBe('active')
  })

  it('records a failed invoice as past due', async () => {
    verifyWebhook.mockReturnValue({ id: 'evt_failed', type: 'invoice.payment_failed', data: { object: { customer: 'cus_1' } } })
    const database = { query: vi.fn().mockResolvedValueOnce({ rows: [{ stripe_event_id: 'evt_failed' }] }).mockResolvedValueOnce({ rows: [] }) }
    requireDatabase.mockReturnValue(database)
    await stripeWebhook({ body: Buffer.from('{}'), headers: {} }, createResponse(), vi.fn())
    expect(database.query.mock.calls[1][0]).toContain("subscription_status = 'past_due'")
  })

  it('syncs paid invoices from Stripe’s current subscription state', async () => {
    verifyWebhook.mockReturnValue({ id: 'evt_paid', type: 'invoice.paid', data: { object: { customer: 'cus_1', subscription: 'sub_1' } } })
    retrieveSubscription.mockResolvedValue(activeSubscription)
    const database = { query: vi.fn().mockResolvedValueOnce({ rows: [{ stripe_event_id: 'evt_paid' }] }).mockResolvedValueOnce({ rows: [{ id_user: user.id_user }] }) }
    requireDatabase.mockReturnValue(database)
    await stripeWebhook({ body: Buffer.from('{}'), headers: {} }, createResponse(), vi.fn())
    expect(retrieveSubscription).toHaveBeenCalledWith('sub_1')
    expect(database.query.mock.calls[1][1][0]).toBe('pro')
  })

  it('ignores a duplicate event', async () => {
    verifyWebhook.mockReturnValue({ id: 'evt_repeat', type: 'customer.subscription.updated', data: { object: activeSubscription } })
    const database = { query: vi.fn().mockResolvedValue({ rows: [] }) }
    requireDatabase.mockReturnValue(database)
    const res = createResponse()
    await stripeWebhook({ body: Buffer.from('{}'), headers: {} }, res, vi.fn())
    expect(database.query).toHaveBeenCalledTimes(1)
    expect(res.json).toHaveBeenCalledWith({ received: true, duplicate: true })
  })
})
