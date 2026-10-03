import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createResponse } from './helpers.js'

vi.mock('../src/config/database.js', () => ({ requireDatabase: vi.fn() }))
import { requireDatabase } from '../src/config/database.js'
import { createResumeShareLink, getSharedResume, listResumeShareLinks, revokeResumeShareLink } from '../src/controllers/resumeShareController.js'

const userId = '8b74e3e1-64b4-46f1-bfd8-c50a174cf908'
const resumeId = 'f8c5d2f2-6ff2-43d2-9e4f-5443200f6d4b'
const linkId = 'aa8dc2f2-6ff2-43d2-9e4f-5443200f6d4b'

describe('resumeShareController', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates a high-entropy link and stores only the SHA-256 token digest', async () => {
    const database = { query: vi.fn().mockResolvedValueOnce({ rows: [{ plan: 'free' }] }).mockResolvedValueOnce({ rows: [{ count: 0 }] }).mockResolvedValueOnce({ rows: [{ id_resume_share_link: linkId, include_contact_details: false }] }) }
    requireDatabase.mockReturnValue(database)
    const res = createResponse(); const next = vi.fn()
    await createResumeShareLink({ params: { id: resumeId }, auth: { sub: userId }, body: { expiresInDays: 30, includeContactDetails: false } }, res, next)
    expect(next).not.toHaveBeenCalled()
    const [sql, params] = database.query.mock.calls[2]
    expect(sql).toContain('token_hash')
    expect(params[0]).toBe(userId); expect(params[1]).toBe(resumeId)
    expect(params[2]).toMatch(/^[a-f0-9]{64}$/)
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith({ link: expect.objectContaining({ id_resume_share_link: linkId, path: expect.stringMatching(/^\/cv\/share\/[A-Za-z0-9_-]{43}$/) }) })
  })

  it('requires ownership, enforces link quota and validates expiration/coordinates choices', async () => {
    requireDatabase.mockReturnValue({ query: vi.fn().mockResolvedValueOnce({ rows: [] }) })
    const missing = vi.fn()
    await createResumeShareLink({ params: { id: resumeId }, auth: { sub: userId }, body: {} }, createResponse(), missing)
    expect(missing.mock.calls[0][0].statusCode).toBe(404)
    requireDatabase.mockReturnValue({ query: vi.fn().mockResolvedValueOnce({ rows: [{ plan: 'free' }] }).mockResolvedValueOnce({ rows: [{ count: 1 }] }) })
    const limit = vi.fn()
    await createResumeShareLink({ params: { id: resumeId }, auth: { sub: userId }, body: {} }, createResponse(), limit)
    expect(limit.mock.calls[0][0].statusCode).toBe(403)
    const invalidExpiration = vi.fn()
    await createResumeShareLink({ params: { id: resumeId }, auth: { sub: userId }, body: { expiresInDays: 4 } }, createResponse(), invalidExpiration)
    expect(invalidExpiration.mock.calls[0][0].statusCode).toBe(400)
    const invalidContact = vi.fn()
    await createResumeShareLink({ params: { id: resumeId }, auth: { sub: userId }, body: { includeContactDetails: 'yes' } }, createResponse(), invalidContact)
    expect(invalidContact.mock.calls[0][0].statusCode).toBe(400)
  })

  it('lists only metadata and revokes only a link owned through the selected CV', async () => {
    const database = { query: vi.fn().mockResolvedValueOnce({ rows: [{ ok: 1 }] }).mockResolvedValueOnce({ rows: [{ id_resume_share_link: linkId, include_contact_details: false }] }) }
    requireDatabase.mockReturnValue(database)
    const listed = createResponse(); const next = vi.fn()
    await listResumeShareLinks({ params: { id: resumeId }, auth: { sub: userId } }, listed, next)
    expect(next).not.toHaveBeenCalled()
    expect(listed.json).toHaveBeenCalledWith({ links: [{ id_resume_share_link: linkId, include_contact_details: false }] })
    const revokeDb = { query: vi.fn().mockResolvedValue({ rows: [{ id_resume_share_link: linkId, revoked_at: '2026-10-01T10:00:00.000Z' }] }) }
    requireDatabase.mockReturnValue(revokeDb)
    const revoked = createResponse()
    await revokeResumeShareLink({ params: { id: resumeId, linkId }, auth: { sub: userId } }, revoked, next)
    expect(revokeDb.query.mock.calls[0][1]).toEqual([linkId, resumeId, userId])
    expect(revoked.json).toHaveBeenCalledWith({ link: expect.objectContaining({ revoked_at: expect.any(String) }) })
  })

  it('only resolves a live opaque token and omits contact and location unless explicitly allowed', async () => {
    const token = 'A'.repeat(43)
    const base = { title_resume: 'CV partagé', job_title: 'Designer', first_name: 'Élise', last_name: 'Durand', email: 'private@example.test', phone: '0600000000', city: 'Paris', summary: 'Résumé', include_contact_details: false }
    const database = { query: vi.fn().mockResolvedValueOnce({ rows: [base] }).mockResolvedValueOnce({ rows: [{ job_title: 'Designer', city: 'Lyon' }] }).mockResolvedValueOnce({ rows: [{ degree: 'Master', city: 'Paris' }] }).mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] }) }
    requireDatabase.mockReturnValue(database)
    const res = createResponse(); const next = vi.fn()
    await getSharedResume({ params: { token } }, res, next)
    expect(next).not.toHaveBeenCalled()
    const response = JSON.stringify(res.json.mock.calls[0][0])
    expect(response).not.toMatch(/private@example|0600000000|Paris|Lyon|id_resume/i)
    const invalid = vi.fn()
    await getSharedResume({ params: { token: 'guessable' } }, createResponse(), invalid)
    expect(invalid.mock.calls[0][0].statusCode).toBe(404)
  })

  it('returns not-found for expired, revoked or guessed links', async () => {
    requireDatabase.mockReturnValue({ query: vi.fn().mockResolvedValue({ rows: [] }) })
    const next = vi.fn()
    await getSharedResume({ params: { token: 'B'.repeat(43) } }, createResponse(), next)
    expect(next.mock.calls[0][0].statusCode).toBe(404)
  })
})
