import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createResponse } from './helpers.js'
vi.mock('../src/config/database.js', () => ({ requireDatabase: vi.fn() }))
vi.mock('../src/services/stripeService.js', () => ({ createCustomerPortal: vi.fn(), createProCheckout: vi.fn(), retrieveSubscription: vi.fn(), verifyWebhook: vi.fn() }))
import { requireDatabase } from '../src/config/database.js'
import { createProCheckout, verifyWebhook } from '../src/services/stripeService.js'
import { checkout, stripeWebhook } from '../src/controllers/billingController.js'

describe('billing controller', () => {
  beforeEach(() => vi.clearAllMocks())
  it('creates Checkout only for the authenticated account', async () => { const database = { query: vi.fn().mockResolvedValue({ rows: [{ id_user: 'user', email: 'marie@example.com', plan: 'free' }] }) }; requireDatabase.mockReturnValue(database); createProCheckout.mockResolvedValue({ url: 'https://checkout.stripe.test/session' }); const res = createResponse(); await checkout({ auth: { sub: 'user' } }, res, vi.fn()); expect(database.query.mock.calls[0][1]).toEqual(['user']); expect(res.json).toHaveBeenCalledWith({ url: 'https://checkout.stripe.test/session' }) })
  it('rejects an invalid webhook signature', async () => { verifyWebhook.mockImplementation(() => { throw Object.assign(new Error('invalid'), { statusCode: 400 }) }); const next = vi.fn(); await stripeWebhook({ body: Buffer.from('{}'), headers: {} }, createResponse(), next); expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 400 }) })
  it('activates Pro from a signed subscription webhook and ignores repeats', async () => { verifyWebhook.mockReturnValue({ id: 'evt_1', type: 'customer.subscription.updated', data: { object: { id: 'sub_1', customer: 'cus_1', status: 'active', current_period_end: 1780000000, metadata: { userId: 'user' } } } }); const database = { query: vi.fn().mockResolvedValueOnce({ rows: [{ stripe_event_id: 'evt_1' }] }).mockResolvedValueOnce({ rows: [{ id_user: 'user' }] }) }; requireDatabase.mockReturnValue(database); const res = createResponse(); await stripeWebhook({ body: Buffer.from('{}'), headers: {} }, res, vi.fn()); expect(database.query.mock.calls[1][1][0]).toBe('pro'); expect(res.status).toHaveBeenCalledWith(200); database.query.mockClear(); database.query.mockResolvedValueOnce({ rows: [] }); await stripeWebhook({ body: Buffer.from('{}'), headers: {} }, createResponse(), vi.fn()); expect(database.query).toHaveBeenCalledTimes(1) })
})
