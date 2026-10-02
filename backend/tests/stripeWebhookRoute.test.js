import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { verifyWebhook, requireDatabase } = vi.hoisted(() => ({ verifyWebhook: vi.fn(), requireDatabase: vi.fn() }))
vi.mock('../src/config/database.js', () => ({ requireDatabase }))
vi.mock('../src/services/stripeService.js', () => ({ createCustomerPortal: vi.fn(), createProCheckout: vi.fn(), retrieveSubscription: vi.fn(), verifyWebhook }))

import app from '../src/app.js'

describe('Stripe webhook route body handling', () => {
  beforeEach(() => vi.clearAllMocks())

  it('passes Stripe the raw request body before JSON parsing', async () => {
    const database = { query: vi.fn().mockResolvedValue({ rows: [{ stripe_event_id: 'evt_ping' }] }) }
    requireDatabase.mockReturnValue(database)
    verifyWebhook.mockReturnValue({ id: 'evt_ping', type: 'unhandled.test.event', data: { object: {} } })
    const response = await request(app).post('/api/v1/stripe/webhook').set('Content-Type', 'application/json').set('stripe-signature', 'test-signature').send('{"id":"evt_ping"}')
    expect(response.status).toBe(200)
    expect(Buffer.isBuffer(verifyWebhook.mock.calls[0][0])).toBe(true)
    expect(verifyWebhook.mock.calls[0][0].toString()).toBe('{"id":"evt_ping"}')
    expect(verifyWebhook.mock.calls[0][1]).toBe('test-signature')
  })
})
