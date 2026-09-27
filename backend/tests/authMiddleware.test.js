import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('jsonwebtoken', () => ({ default: { verify: vi.fn() } }))

import jwt from 'jsonwebtoken'
import authenticate from '../src/middleware/authMiddleware.js'

describe('authenticate middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.JWT_SECRET = 'test-secret'
  })

  it('rejects missing authorization headers', () => {
    const next = vi.fn()
    authenticate({ headers: {} }, {}, next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 401 })
  })

  it('rejects an authorization header that is not a Bearer token', () => {
    const next = vi.fn()
    authenticate({ headers: { authorization: 'Basic abc' } }, {}, next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 401 })
  })

  it('rejects requests when the JWT secret is not configured', () => {
    delete process.env.JWT_SECRET
    const next = vi.fn()
    authenticate({ headers: { authorization: 'Bearer token' } }, {}, next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 500 })
  })

  it('adds decoded JWT data to the request', () => {
    jwt.verify.mockReturnValue({ sub: 'user-id', email: 'marie@example.com' })
    const req = { headers: { authorization: 'Bearer valid-token' } }
    const next = vi.fn()
    authenticate(req, {}, next)
    expect(req.auth).toEqual({ sub: 'user-id', email: 'marie@example.com' })
    expect(next).toHaveBeenCalledWith()
  })

  it('rejects invalid JWTs', () => {
    jwt.verify.mockImplementation(() => { throw new Error('invalid') })
    const next = vi.fn()
    authenticate({ headers: { authorization: 'Bearer invalid-token' } }, {}, next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 401 })
  })
})
