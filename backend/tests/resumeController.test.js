import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createResponse } from './helpers.js'

vi.mock('../src/config/database.js', () => ({ requireDatabase: vi.fn() }))

import { requireDatabase } from '../src/config/database.js'
import { createResume, getResume, listResumes } from '../src/controllers/resumeController.js'

const userId = '8b74e3e1-64b4-46f1-bfd8-c50a174cf908'
const resume = { id_resume: 'f8c5d2f2-6ff2-43d2-9e4f-5443200f6d4b', title_resume: 'CV Produit', job_title: 'Product Designer', first_name: 'Marie', last_name: 'Laurent', email: null, phone: null, city: null, summary: null, created_at: '2026-01-01', updated_at: '2026-01-01' }

describe('resumeController', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists only the resumes returned for the authenticated user', async () => {
    const database = { query: vi.fn().mockResolvedValue({ rows: [resume] }) }
    requireDatabase.mockReturnValue(database)
    const res = createResponse()
    await listResumes({ auth: { sub: userId } }, res, vi.fn())
    expect(database.query.mock.calls[0][1]).toEqual([userId])
    expect(res.json.mock.calls[0][0].resumes).toHaveLength(1)
  })

  it('passes listing database failures to the error handler', async () => {
    requireDatabase.mockReturnValue({ query: vi.fn().mockRejectedValue(new Error('database unavailable')) })
    const next = vi.fn()
    await listResumes({ auth: { sub: userId } }, createResponse(), next)
    expect(next.mock.calls[0][0].message).toBe('database unavailable')
  })

  it('validates required resume fields before insertion', async () => {
    const next = vi.fn()
    await createResume({ auth: { sub: userId }, body: { title_resume: '', first_name: '', last_name: '', job_title: '' } }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 400 })
    expect(requireDatabase).not.toHaveBeenCalled()
  })

  it('creates a resume owned by the authenticated user', async () => {
    const database = { query: vi.fn().mockResolvedValue({ rows: [resume] }) }
    requireDatabase.mockReturnValue(database)
    const res = createResponse()
    await createResume({ auth: { sub: userId }, body: { title_resume: ' CV Produit ', first_name: ' Marie ', last_name: ' Laurent ', job_title: ' Product Designer ' } }, res, vi.fn())
    expect(database.query.mock.calls[0][1]).toEqual([userId, 'CV Produit', 'Marie', 'Laurent', 'Product Designer'])
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json.mock.calls[0][0].resume.id_resume).toBe(resume.id_resume)
  })

  it('passes resume creation database failures to the error handler', async () => {
    requireDatabase.mockReturnValue({ query: vi.fn().mockRejectedValue(new Error('database unavailable')) })
    const next = vi.fn()
    await createResume({ auth: { sub: userId }, body: { title_resume: 'CV', first_name: 'Marie', last_name: 'Laurent', job_title: 'Designer' } }, createResponse(), next)
    expect(next.mock.calls[0][0].message).toBe('database unavailable')
  })

  it('rejects an invalid resume identifier', async () => {
    const next = vi.fn()
    await getResume({ auth: { sub: userId }, params: { id: 'not-a-uuid' } }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 400 })
  })

  it('returns 404 when a resume is not owned by the requester', async () => {
    requireDatabase.mockReturnValue({ query: vi.fn().mockResolvedValue({ rows: [] }) })
    const next = vi.fn()
    await getResume({ auth: { sub: userId }, params: { id: resume.id_resume } }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 404 })
  })

  it('returns a matching resume', async () => {
    requireDatabase.mockReturnValue({ query: vi.fn().mockResolvedValue({ rows: [resume] }) })
    const res = createResponse()
    await getResume({ auth: { sub: userId }, params: { id: resume.id_resume } }, res, vi.fn())
    expect(res.json.mock.calls[0][0].resume.title_resume).toBe('CV Produit')
  })

  it('queries a resume with both its identifier and user ownership', async () => {
    const database = { query: vi.fn().mockResolvedValue({ rows: [resume] }) }
    requireDatabase.mockReturnValue(database)
    await getResume({ auth: { sub: userId }, params: { id: resume.id_resume } }, createResponse(), vi.fn())
    expect(database.query.mock.calls[0][1]).toEqual([resume.id_resume, userId])
  })
})
