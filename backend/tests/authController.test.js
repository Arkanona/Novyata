import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createResponse } from './helpers.js'

vi.mock('bcrypt', () => ({ default: { hash: vi.fn(), compare: vi.fn() } }))
vi.mock('jsonwebtoken', () => ({ default: { sign: vi.fn() } }))
vi.mock('../src/config/database.js', () => ({ requireDatabase: vi.fn() }))

import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { requireDatabase } from '../src/config/database.js'
import { changePassword, deleteAccount, login, me, register, updateProfile } from '../src/controllers/authController.js'

const user = { id_user: '8b74e3e1-64b4-46f1-bfd8-c50a174cf908', first_name: 'Marie', last_name: 'Laurent', email: 'marie@example.com', password: 'hash', created_at: '2026-01-01' }

describe('authController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.JWT_SECRET = 'test-secret'
    process.env.JWT_EXPIRES_IN = '7d'
  })

  it('refuses an invalid registration before querying the database', async () => {
    const next = vi.fn()
    await register({ body: { first_name: 'M', last_name: '', email: 'wrong', password: 'short' } }, createResponse(), next)
    expect(next.mock.calls[0][0].statusCode).toBe(400)
    expect(requireDatabase).not.toHaveBeenCalled()
  })

  it('validates a malformed email even when names and password are valid', async () => {
    const next = vi.fn()
    await register({ body: { first_name: 'Marie', last_name: 'Laurent', email: 'not-an-email', password: 'Password123' } }, createResponse(), next)
    expect(next.mock.calls[0][0].details).toEqual({ email: 'Adresse e-mail invalide.' })
  })

  it('validates a missing registration email', async () => {
    const next = vi.fn()
    await register({ body: { first_name: 'Marie', last_name: 'Laurent', password: 'Password123' } }, createResponse(), next)
    expect(next.mock.calls[0][0].details).toEqual({ email: 'Adresse e-mail invalide.' })
  })

  it('refuses an invalid login payload before querying the database', async () => {
    const next = vi.fn()
    await login({ body: { email: 'invalid', password: '' } }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 400 })
    expect(requireDatabase).not.toHaveBeenCalled()
  })

  it('validates a missing password with a valid login email', async () => {
    const next = vi.fn()
    await login({ body: { email: 'marie@example.com', password: '' } }, createResponse(), next)
    expect(next.mock.calls[0][0].details).toEqual({ password: 'Mot de passe requis.' })
  })

  it('validates a missing login email', async () => {
    const next = vi.fn()
    await login({ body: { password: 'Password123' } }, createResponse(), next)
    expect(next.mock.calls[0][0].details).toEqual({ email: 'Adresse e-mail invalide.' })
  })

  it('registers, hashes the password and never returns it', async () => {
    const database = { query: vi.fn().mockResolvedValue({ rows: [user] }) }
    requireDatabase.mockReturnValue(database)
    bcrypt.hash.mockResolvedValue('hash')
    jwt.sign.mockReturnValue('signed-token')
    const res = createResponse()

    await register({ body: { first_name: ' Marie ', last_name: ' Laurent ', email: 'MARIE@EXAMPLE.COM ', password: 'Password123' } }, res, vi.fn())

    expect(bcrypt.hash).toHaveBeenCalledWith('Password123', 12)
    expect(database.query.mock.calls[0][1]).toEqual(['Marie', 'Laurent', 'marie@example.com', 'hash'])
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json.mock.calls[0][0]).toEqual({ user: { id_user: user.id_user, first_name: 'Marie', last_name: 'Laurent', email: 'marie@example.com', created_at: user.created_at }, token: 'signed-token' })
  })

  it('reports duplicate email cleanly', async () => {
    requireDatabase.mockReturnValue({ query: vi.fn().mockRejectedValue({ code: '23505' }) })
    bcrypt.hash.mockResolvedValue('hash')
    const next = vi.fn()
    await register({ body: { first_name: 'Marie', last_name: 'Laurent', email: 'marie@example.com', password: 'Password123' } }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 409 })
  })

  it('passes unexpected registration failures to the error handler', async () => {
    requireDatabase.mockReturnValue({ query: vi.fn().mockRejectedValue(new Error('network failure')) })
    bcrypt.hash.mockResolvedValue('hash')
    const next = vi.fn()
    await register({ body: { first_name: 'Marie', last_name: 'Laurent', email: 'marie@example.com', password: 'Password123' } }, createResponse(), next)
    expect(next.mock.calls[0][0].message).toBe('network failure')
  })

  it('rejects wrong login credentials', async () => {
    requireDatabase.mockReturnValue({ query: vi.fn().mockResolvedValue({ rows: [user] }) })
    bcrypt.compare.mockResolvedValue(false)
    const next = vi.fn()
    await login({ body: { email: user.email, password: 'WrongPassword' } }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 401 })
  })

  it('rejects login when the user does not exist', async () => {
    requireDatabase.mockReturnValue({ query: vi.fn().mockResolvedValue({ rows: [] }) })
    const next = vi.fn()
    await login({ body: { email: user.email, password: 'Password123' } }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 401 })
    expect(bcrypt.compare).not.toHaveBeenCalled()
  })

  it('returns a token and public user data on login', async () => {
    requireDatabase.mockReturnValue({ query: vi.fn().mockResolvedValue({ rows: [user] }) })
    bcrypt.compare.mockResolvedValue(true)
    jwt.sign.mockReturnValue('signed-token')
    const res = createResponse()
    await login({ body: { email: user.email, password: 'Password123' } }, res, vi.fn())
    expect(res.json.mock.calls[0][0].user.password).toBeUndefined()
    expect(res.json.mock.calls[0][0].token).toBe('signed-token')
  })

  it('uses the default JWT expiry when JWT_EXPIRES_IN is absent', async () => {
    delete process.env.JWT_EXPIRES_IN
    requireDatabase.mockReturnValue({ query: vi.fn().mockResolvedValue({ rows: [user] }) })
    bcrypt.compare.mockResolvedValue(true)
    jwt.sign.mockReturnValue('signed-token')
    await login({ body: { email: user.email, password: 'Password123' } }, createResponse(), vi.fn())
    expect(jwt.sign).toHaveBeenCalledWith({ sub: user.id_user, email: user.email }, 'test-secret', { expiresIn: '7d' })
  })

  it('returns a controlled error when JWT signing is not configured', async () => {
    delete process.env.JWT_SECRET
    requireDatabase.mockReturnValue({ query: vi.fn().mockResolvedValue({ rows: [user] }) })
    bcrypt.compare.mockResolvedValue(true)
    const next = vi.fn()
    await login({ body: { email: user.email, password: 'Password123' } }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 500 })
  })

  it('returns the current user from the JWT subject', async () => {
    requireDatabase.mockReturnValue({ query: vi.fn().mockResolvedValue({ rows: [user] }) })
    const res = createResponse()
    await me({ auth: { sub: user.id_user } }, res, vi.fn())
    expect(res.json.mock.calls[0][0].user).not.toHaveProperty('password')
  })

  it('returns 401 when the JWT subject no longer has a user', async () => {
    requireDatabase.mockReturnValue({ query: vi.fn().mockResolvedValue({ rows: [] }) })
    const next = vi.fn()
    await me({ auth: { sub: user.id_user } }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 401 })
  })

  it('passes a database error from current-user lookup to the error handler', async () => {
    requireDatabase.mockReturnValue({ query: vi.fn().mockRejectedValue(new Error('database unavailable')) })
    const next = vi.fn()
    await me({ auth: { sub: user.id_user } }, createResponse(), next)
    expect(next.mock.calls[0][0].message).toBe('database unavailable')
  })

  it('updates only the authenticated user profile', async () => {
    const database = { query: vi.fn().mockResolvedValue({ rows: [user] }) }; requireDatabase.mockReturnValue(database)
    const res = createResponse(); await updateProfile({ auth: { sub: user.id_user }, body: { first_name: 'Julie', last_name: 'Laurent', email: 'julie@example.com' } }, res, vi.fn())
    expect(database.query.mock.calls[0][1]).toEqual(['Julie', 'Laurent', 'julie@example.com', user.id_user])
    expect(res.json).toHaveBeenCalled()
  })

  it('rejects an incorrect current password before changing it', async () => {
    const database = { query: vi.fn().mockResolvedValue({ rows: [user] }) }; requireDatabase.mockReturnValue(database); bcrypt.compare.mockResolvedValue(false)
    const next = vi.fn(); await changePassword({ auth: { sub: user.id_user }, body: { current_password: 'bad', new_password: 'Password123', confirmation: 'Password123' } }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 400 })
  })

  it('deletes the authenticated account and relies on database cascades for related data', async () => {
    requireDatabase.mockReturnValue({ query: vi.fn().mockResolvedValue({ rows: [{ id_user: user.id_user }] }) }); const res = createResponse()
    await deleteAccount({ auth: { sub: user.id_user } }, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(204)
  })
})
