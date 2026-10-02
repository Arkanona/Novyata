import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createResponse } from './helpers.js'

vi.mock('../src/config/database.js', () => ({ requireDatabase: vi.fn() }))
import { requireDatabase } from '../src/config/database.js'
import { createCustomSection, createResumeVariant, reorderResumeSections } from '../src/controllers/resumeProController.js'

const userId = '8b74e3e1-64b4-46f1-bfd8-c50a174cf908'
const resumeId = 'f8c5d2f2-6ff2-43d2-9e4f-5443200f6d4b'
const variantId = 'aa8dc2f2-6ff2-43d2-9e4f-5443200f6d4b'

describe('resume Pro controller', () => {
  beforeEach(() => vi.clearAllMocks())

  it('prevents a Free user from adding an advanced section', async () => {
    const database = { query: vi.fn().mockResolvedValue({ rows: [{ id_resume: resumeId, plan: 'free' }] }) }
    requireDatabase.mockReturnValue(database)
    const next = vi.fn()
    await createCustomSection({ params: { id: resumeId }, auth: { sub: userId }, body: { section_type: 'projects', content: 'Portfolio de projets' } }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 403, details: { upgrade: true } })
    expect(database.query).toHaveBeenCalledTimes(1)
  })

  it('creates an optional project section for a Pro user', async () => {
    const section = { id_resume_section: variantId, id_resume: resumeId, section_type: 'projects', title: 'Projets', content: 'Application produit' }
    const database = { query: vi.fn().mockResolvedValueOnce({ rows: [{ id_resume: resumeId, plan: 'pro' }] }).mockResolvedValueOnce({ rows: [section] }) }
    requireDatabase.mockReturnValue(database)
    const res = createResponse()
    await createCustomSection({ params: { id: resumeId }, auth: { sub: userId }, body: { section_type: 'projects', content: 'Application produit' } }, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json.mock.calls[0][0].section).toMatchObject({ title: 'Projets', content: 'Application produit' })
  })

  it('copies a CV and its section data as an independent Pro variant', async () => {
    const variant = { id_resume: variantId, parent_resume_id: resumeId, title_resume: 'CloudNova' }
    const clientQuery = vi.fn().mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [variant] }).mockResolvedValue({ rows: [] })
    const client = { query: clientQuery, release: vi.fn() }
    const database = { query: vi.fn().mockResolvedValue({ rows: [{ id_resume: resumeId, plan: 'pro' }] }), connect: vi.fn().mockResolvedValue(client) }
    requireDatabase.mockReturnValue(database)
    const res = createResponse()
    await createResumeVariant({ params: { id: resumeId }, auth: { sub: userId }, body: { title_resume: 'CloudNova' } }, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json.mock.calls[0][0].resume).toMatchObject({ id_resume: variantId, parent_resume_id: resumeId })
    expect(clientQuery.mock.calls[1][0]).toContain('coalesce(parent_resume_id,id_resume)')
    expect(clientQuery.mock.calls.filter(([sql]) => sql.startsWith('insert into')).length).toBe(6)
    expect(clientQuery).toHaveBeenCalledWith('commit')
    expect(client.release).toHaveBeenCalled()
  })

  it('does not create variants for Free users', async () => {
    const database = { query: vi.fn().mockResolvedValue({ rows: [{ id_resume: resumeId, plan: 'free' }] }), connect: vi.fn() }
    requireDatabase.mockReturnValue(database)
    const next = vi.fn()
    await createResumeVariant({ params: { id: resumeId }, auth: { sub: userId }, body: { title_resume: 'Autre version' } }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 403, details: { feature: 'resumeVariants' } })
    expect(database.connect).not.toHaveBeenCalled()
  })

  it('rejects ordering that references a section owned by another CV', async () => {
    const foreignSection = 'bb8dc2f2-6ff2-43d2-9e4f-5443200f6d4b'
    const database = { query: vi.fn().mockResolvedValueOnce({ rows: [{ id_resume: resumeId, plan: 'pro' }] }).mockResolvedValueOnce({ rows: [] }) }
    requireDatabase.mockReturnValue(database)
    const next = vi.fn()
    await reorderResumeSections({ params: { id: resumeId }, auth: { sub: userId }, body: { section_order: ['experiences', `custom:${foreignSection}`] } }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 400 })
    expect(database.query).toHaveBeenCalledTimes(2)
  })
})
