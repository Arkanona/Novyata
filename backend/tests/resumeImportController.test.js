import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createResponse } from './helpers.js'

vi.mock('../src/config/database.js', () => ({ requireDatabase: vi.fn() }))
vi.mock('../src/services/resumeImportService.js', () => ({ parseResumeMultipart: vi.fn() }))

import { requireDatabase } from '../src/config/database.js'
import { parseResumeMultipart } from '../src/services/resumeImportService.js'
import { createResumeFromImport, parseResumeImport } from '../src/controllers/resumeImportController.js'

const userId = '8b74e3e1-64b4-46f1-bfd8-c50a174cf908'
const resume = { id_resume: 'f8c5d2f2-6ff2-43d2-9e4f-5443200f6d4b', title_resume: 'CV Camille', first_name: 'Camille', last_name: 'Dubois', job_title: 'Product Designer' }
const payload = { ...resume, email: 'camille@example.com', city: 'Lyon', summary: 'Designer produit.', experiences: [{ job_title: 'Designer', company: 'Atelier produit', is_current: true, description: 'Recherche utilisateur.' }], educations: [{ degree: 'Master design', school: 'École produit' }], skills: [{ name: 'Figma', level: '' }], languages: [{ name: 'Français', level: 'Courant' }] }

describe('resumeImportController', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns parsed suggestions to the authenticated request without saving a CV', async () => {
    const parsed = { format: 'pdf', ...resume, needs_review: ['experiences'], raw_text: 'extracted text' }
    parseResumeMultipart.mockResolvedValue(parsed)
    const req = { auth: { sub: userId }, headers: {} }; const res = createResponse()
    await parseResumeImport(req, res, vi.fn())
    expect(parseResumeMultipart).toHaveBeenCalledWith(req)
    expect(res.json).toHaveBeenCalledWith({ import: parsed })
    expect(requireDatabase).not.toHaveBeenCalled()
  })

  it('creates the confirmed CV and its sections atomically for the authenticated user', async () => {
    const client = { query: vi.fn().mockResolvedValue({ rows: [] }), release: vi.fn() }
    client.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ plan: 'free' }] }).mockResolvedValueOnce({ rows: [{ import_count: 1 }] }).mockResolvedValueOnce({ rows: [resume] })
    requireDatabase.mockReturnValue({ connect: vi.fn().mockResolvedValue(client) })
    const res = createResponse(); const next = vi.fn()
    await createResumeFromImport({ auth: { sub: userId }, body: payload }, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(client.query.mock.calls[0][0]).toBe('begin')
    expect(client.query.mock.calls[2][0]).toContain('select plan from users')
    expect(client.query.mock.calls[3][0]).toContain('insert into resume_import_usage')
    expect(client.query.mock.calls[3][1]).toEqual([userId, expect.any(String), 3])
    expect(client.query.mock.calls[4][0]).toContain('insert into resumes')
    expect(client.query.mock.calls[4][1][0]).toBe(userId)
    expect(client.query.mock.calls.map(([sql]) => sql).filter((sql) => sql.startsWith('insert into '))).toEqual(expect.arrayContaining([
      expect.stringContaining('insert into resumes'), expect.stringContaining('insert into experiences'), expect.stringContaining('insert into educations'), expect.stringContaining('insert into skills'), expect.stringContaining('insert into languages'),
    ]))
    expect(client.query.mock.calls.at(-1)[0]).toBe('commit')
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json.mock.calls[0][0].resume).toMatchObject({ ...resume, experiences: payload.experiences, languages: payload.languages })
    expect(client.release).toHaveBeenCalledOnce()
  })

  it('rolls back a partially inserted resume if a section insert fails', async () => {
    const client = { query: vi.fn().mockResolvedValue({ rows: [] }), release: vi.fn() }
    client.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ plan: 'free' }] }).mockResolvedValueOnce({ rows: [{ import_count: 1 }] }).mockResolvedValueOnce({ rows: [resume] }).mockRejectedValueOnce(new Error('section insert failed'))
    requireDatabase.mockReturnValue({ connect: vi.fn().mockResolvedValue(client) })
    const next = vi.fn()
    await createResumeFromImport({ auth: { sub: userId }, body: payload }, createResponse(), next)
    expect(client.query.mock.calls.map(([sql]) => sql)).toContain('rollback')
    expect(client.release).toHaveBeenCalledOnce()
    expect(next.mock.calls[0][0].message).toBe('section insert failed')
  })

  it('enforces plan-specific monthly imports and does not consume quota when the free limit is reached', async () => {
    const client = { query: vi.fn().mockResolvedValue({ rows: [] }), release: vi.fn() }
    client.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ plan: 'free' }] }).mockResolvedValueOnce({ rows: [] })
    requireDatabase.mockReturnValue({ connect: vi.fn().mockResolvedValue(client) })
    const next = vi.fn()
    await createResumeFromImport({ auth: { sub: userId }, body: payload }, createResponse(), next)
    expect(client.query.mock.calls[3][1][2]).toBe(3)
    expect(client.query.mock.calls.map(([sql]) => sql)).toContain('rollback')
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 429, details: { feature: 'resume_import', limit: 3, upgrade: true } })
    expect(client.query.mock.calls.some(([sql]) => sql.includes('insert into resumes'))).toBe(false)
  })

  it('requires the user to correct required fields and unknown language levels before touching the database', async () => {
    const next = vi.fn()
    await createResumeFromImport({ auth: { sub: userId }, body: { ...payload, experiences: [{ job_title: 'Designer', company: '' }] } }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 400 })
    expect(requireDatabase).not.toHaveBeenCalled()
    const nextLanguage = vi.fn()
    await createResumeFromImport({ auth: { sub: userId }, body: { ...payload, languages: [{ name: 'Français', level: '' }] } }, createResponse(), nextLanguage)
    expect(nextLanguage.mock.calls[0][0]).toMatchObject({ statusCode: 400 })
    expect(requireDatabase).not.toHaveBeenCalled()
  })
})
