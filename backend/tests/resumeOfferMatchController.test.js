import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createResponse } from './helpers.js'

vi.mock('../src/config/database.js', () => ({ requireDatabase: vi.fn() }))
import { requireDatabase } from '../src/config/database.js'
import { matchResumesToOfferController } from '../src/controllers/resumeOfferMatchController.js'

const userId = '8b74e3e1-64b4-46f1-bfd8-c50a174cf908'
const resumes = [
  { id_resume: 'resume-a', title_resume: 'Data CV', job_title: 'Data Analyst', skills: [{ name: 'SQL' }, { name: 'Power BI' }], experiences: [], educations: [] },
  { id_resume: 'resume-b', title_resume: 'Web CV', job_title: 'Développeur', skills: [{ name: 'React' }], experiences: [], educations: [] },
]

describe('resumeOfferMatchController', () => {
  beforeEach(() => vi.clearAllMocks())

  it('requires a non-empty offer before reading the database', async () => {
    const next = vi.fn()
    await matchResumesToOfferController({ body: { jobDescription: '' }, auth: { sub: userId } }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 400 })
    expect(requireDatabase).not.toHaveBeenCalled()
  })

  it('rejects Free plan and does not query CVs', async () => {
    const database = { query: vi.fn().mockResolvedValue({ rows: [{ plan: 'free' }] }) }
    requireDatabase.mockReturnValue(database)
    const next = vi.fn()
    await matchResumesToOfferController({ body: { jobDescription: 'SQL et Python' }, auth: { sub: userId } }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 403 })
    expect(database.query).toHaveBeenCalledTimes(1)
  })

  it('checks the authenticated owner and returns a neutral multi-CV estimate', async () => {
    const database = { query: vi.fn().mockResolvedValueOnce({ rows: [{ plan: 'pro' }] }).mockResolvedValueOnce({ rows: resumes }) }
    requireDatabase.mockReturnValue(database)
    const res = createResponse()
    await matchResumesToOfferController({ body: { jobDescription: 'SQL, Power BI et Python' }, auth: { sub: userId } }, res, vi.fn())
    expect(database.query.mock.calls[1][1]).toEqual([userId])
    expect(database.query.mock.calls[1][0]).toContain('where r.id_user=$1')
    expect(res.json).toHaveBeenCalledWith({ matching: expect.objectContaining({ confidence: 'estimated', results: expect.arrayContaining([expect.objectContaining({ title: 'Data CV', score: 67 }), expect.objectContaining({ title: 'Web CV', score: 0 })]) }) })
  })

  it('does not present a score when no supported offer skills are detected', async () => {
    const database = { query: vi.fn().mockResolvedValueOnce({ rows: [{ plan: 'pro' }] }).mockResolvedValueOnce({ rows: resumes }) }
    requireDatabase.mockReturnValue(database)
    const res = createResponse()
    await matchResumesToOfferController({ body: { jobDescription: 'Rejoignez notre équipe dynamique.' }, auth: { sub: userId } }, res, vi.fn())
    expect(res.json).toHaveBeenCalledWith({ matching: expect.objectContaining({ confidence: 'insufficient_data', results: expect.arrayContaining([expect.objectContaining({ score: null })]) }) })
  })
})
