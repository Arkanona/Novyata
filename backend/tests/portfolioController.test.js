import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createResponse } from './helpers.js'

vi.mock('../src/config/database.js', () => ({ requireDatabase: vi.fn() }))
import { requireDatabase } from '../src/config/database.js'
import { getMyPortfolio, getPublicPortfolio, saveMyPortfolio } from '../src/controllers/portfolioController.js'

const userId = '8b74e3e1-64b4-46f1-bfd8-c50a174cf908'
const resumeId = 'f8c5d2f2-6ff2-43d2-9e4f-5443200f6d4b'
const visible = { name: false, job_title: true, summary: false, experiences: true, educations: false, skills: false, languages: false, custom_sections: false }

describe('portfolioController', () => {
  beforeEach(() => vi.clearAllMocks())

  it('uses private defaults when the user has not configured a portfolio', async () => {
    requireDatabase.mockReturnValue({ query: vi.fn().mockResolvedValue({ rows: [] }) })
    const res = createResponse(); const next = vi.fn()
    await getMyPortfolio({ auth: { sub: userId } }, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith({ profile: null, defaults: expect.objectContaining({ name: false, summary: false, experiences: false }) })
  })

  it('validates explicit visibility choices and checks ownership before saving', async () => {
    const database = { query: vi.fn().mockResolvedValueOnce({ rows: [{ ok: 1 }] }).mockResolvedValueOnce({ rows: [{ slug: 'elise-durand', id_resume: resumeId, is_published: false, visible_sections: visible }] }) }
    requireDatabase.mockReturnValue(database)
    const res = createResponse(); const next = vi.fn()
    await saveMyPortfolio({ body: { slug: 'elise-durand', id_resume: resumeId, is_published: false, visible_sections: visible }, auth: { sub: userId } }, res, next)
    expect(database.query.mock.calls[0][1]).toEqual([resumeId, userId])
    expect(database.query.mock.calls[1][1]).toEqual([userId, resumeId, 'elise-durand', false, JSON.stringify(visible)])
    expect(next).not.toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith({ profile: expect.objectContaining({ slug: 'elise-durand', is_published: false }) })
  })

  it('rejects a CV owned by another user and unsafe publication options', async () => {
    const database = { query: vi.fn().mockResolvedValue({ rows: [] }) }
    requireDatabase.mockReturnValue(database)
    const next = vi.fn()
    await saveMyPortfolio({ body: { slug: 'elise', id_resume: resumeId, is_published: true, visible_sections: visible }, auth: { sub: userId } }, createResponse(), next)
    expect(next.mock.calls[0][0].statusCode).toBe(404)
    const invalid = vi.fn()
    await saveMyPortfolio({ body: { slug: 'https://example.com', id_resume: null, is_published: true, visible_sections: { ...visible, email: true } }, auth: { sub: userId } }, createResponse(), invalid)
    expect(invalid.mock.calls[0][0].statusCode).toBe(400)
    const invalidSlug = vi.fn()
    await saveMyPortfolio({ body: { slug: 'Élise Durand', id_resume: null, is_published: true, visible_sections: visible }, auth: { sub: userId } }, createResponse(), invalidSlug)
    expect(invalidSlug.mock.calls[0][0].statusCode).toBe(400)
    expect(database.query).toHaveBeenCalledOnce()
  })

  it('returns only explicitly selected public data and never selects personal contact or address fields', async () => {
    const experience = { job_title: 'Designer UX', company: 'Studio Nova', description: 'Conception de parcours.' }
    const database = { query: vi.fn().mockResolvedValueOnce({ rows: [{ visible_sections: visible, id_resume: resumeId, first_name: 'Élise', last_name: 'Durand', job_title: 'Product Designer', summary: 'Privé' }] }).mockResolvedValueOnce({ rows: [experience] }) }
    requireDatabase.mockReturnValue(database)
    const res = createResponse(); const next = vi.fn()
    await getPublicPortfolio({ params: { slug: 'elise-durand' } }, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith({ portfolio: { name: null, jobTitle: 'Product Designer', summary: null, experiences: [experience], educations: [], skills: [], languages: [], customSections: [] } })
    expect(database.query.mock.calls.map(([sql]) => sql).join(' ')).not.toMatch(/email|phone|city/i)
  })

  it('returns the same not-found response when the portfolio is not published', async () => {
    requireDatabase.mockReturnValue({ query: vi.fn().mockResolvedValue({ rows: [] }) })
    const next = vi.fn()
    await getPublicPortfolio({ params: { slug: 'elise-durand' } }, createResponse(), next)
    expect(next.mock.calls[0][0].statusCode).toBe(404)
    expect(next.mock.calls[0][0].message).toBe('Portfolio introuvable.')
  })
})
