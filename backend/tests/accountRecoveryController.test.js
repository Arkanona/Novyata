import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createResponse } from './helpers.js'
vi.mock('bcrypt', () => ({ default: { hash: vi.fn() } }))
vi.mock('../src/config/database.js', () => ({ requireDatabase: vi.fn() }))
vi.mock('../src/services/emailService.js', () => ({ sendPasswordResetEmail: vi.fn(), sendVerificationEmail: vi.fn() }))
import bcrypt from 'bcrypt'
import { requireDatabase } from '../src/config/database.js'
import { sendPasswordResetEmail, sendVerificationEmail } from '../src/services/emailService.js'
import { forgotPassword, resendVerification, resetPassword, verifyEmail } from '../src/controllers/authController.js'

describe('account recovery controller', () => {
  beforeEach(() => vi.clearAllMocks())
  it('verifies a valid e-mail token and rejects expired or invalid ones', async () => {
    const database = { query: vi.fn().mockResolvedValueOnce({ rows: [{ id_user: 'user' }] }).mockResolvedValueOnce({ rows: [] }) }; requireDatabase.mockReturnValue(database)
    const success = createResponse(); await verifyEmail({ body: { token: 'valid-token' } }, success, vi.fn()); expect(success.status).toHaveBeenCalledWith(204)
    const next = vi.fn(); await verifyEmail({ body: { token: 'expired-token' } }, createResponse(), next); expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 400 })
  })
  it('does not reveal whether an e-mail exists during password recovery', async () => {
    const known = { query: vi.fn().mockResolvedValueOnce({ rows: [{ id_user: 'user', email: 'marie@example.com' }] }).mockResolvedValueOnce({ rows: [] }) }; requireDatabase.mockReturnValue(known)
    const first = createResponse(); await forgotPassword({ body: { email: 'marie@example.com' } }, first, vi.fn()); expect(first.status).toHaveBeenCalledWith(204); expect(sendPasswordResetEmail).toHaveBeenCalledOnce()
    const unknown = { query: vi.fn().mockResolvedValue({ rows: [] }) }; requireDatabase.mockReturnValue(unknown); const second = createResponse(); await forgotPassword({ body: { email: 'unknown@example.com' } }, second, vi.fn()); expect(second.status).toHaveBeenCalledWith(204); expect(sendPasswordResetEmail).toHaveBeenCalledOnce()
  })
  it('invalidates a reset token after use and rejects a reused token', async () => {
    bcrypt.hash.mockResolvedValue('hash'); const database = { query: vi.fn().mockResolvedValueOnce({ rows: [{ id_user: 'user' }] }).mockResolvedValueOnce({ rows: [] }) }; requireDatabase.mockReturnValue(database)
    const first = createResponse(); await resetPassword({ body: { token: 'token', password: 'Password123', confirmation: 'Password123' } }, first, vi.fn()); expect(first.status).toHaveBeenCalledWith(204)
    const next = vi.fn(); await resetPassword({ body: { token: 'token', password: 'Password123', confirmation: 'Password123' } }, createResponse(), next); expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 400 })
  })
  it('resends verification only for the authenticated, unverified account', async () => {
    const database = { query: vi.fn().mockResolvedValueOnce({ rows: [{ id_user: 'user', email: 'marie@example.com', email_verified: false }] }).mockResolvedValueOnce({ rows: [] }) }; requireDatabase.mockReturnValue(database)
    const res = createResponse(); await resendVerification({ auth: { sub: 'user' } }, res, vi.fn()); expect(res.status).toHaveBeenCalledWith(204); expect(sendVerificationEmail).toHaveBeenCalledOnce()
  })
})
