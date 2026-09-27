import { afterEach, describe, expect, it, vi } from 'vitest'
import { getCurrentUser, loginUser, registerUser } from './authService'

describe('authService', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('sends registration data to the correct endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ token: 'token', user: { email: 'marie@example.com' } }) })
    vi.stubGlobal('fetch', fetchMock)
    await registerUser({ first_name: 'Marie', last_name: 'Laurent', email: 'marie@example.com', password: 'Password123' })
    expect(fetchMock.mock.calls[0][0]).toContain('/api/v1/auth/register')
    expect(fetchMock.mock.calls[0][1].method).toBe('POST')
  })

  it('sends login data and authorizes current-user requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ user: {} }) })
    vi.stubGlobal('fetch', fetchMock)
    await loginUser({ email: 'marie@example.com', password: 'Password123' })
    await getCurrentUser('jwt-token')
    expect(fetchMock.mock.calls[0][0]).toContain('/api/v1/auth/login')
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer jwt-token')
  })

  it('normalizes API errors with field details', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: { message: 'Adresse invalide.', details: { email: 'Invalide' } } }) }))
    await expect(loginUser({ email: 'wrong', password: 'a' })).rejects.toMatchObject({ message: 'Adresse invalide.', details: { email: 'Invalide' } })
  })
})
