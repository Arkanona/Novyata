import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createResponse } from './helpers.js'

vi.mock('../src/config/database.js', () => ({ requireDatabase: vi.fn() }))
vi.mock('../src/services/jobAnalysisService.js', () => ({ analyzeJobDescription: vi.fn() }))

import { requireDatabase } from '../src/config/database.js'
import { analyzeJobDescription } from '../src/services/jobAnalysisService.js'
import { analyzeJob } from '../src/controllers/jobAnalysisController.js'
import ApiError from '../src/utils/ApiError.js'

const userId = '8b74e3e1-64b4-46f1-bfd8-c50a174cf908'
const otherUserId = '3f6070dc-e2c2-48e0-9089-a07155fbec2f'
const resumeId = 'f8c5d2f2-6ff2-43d2-9e4f-5443200f6d4b'
const body = { resumeId, jobDescription: 'Nous recherchons un Product Designer maîtrisant Figma, la recherche utilisateur et les tests.' }
const validAnalysis = { matchScore: 72, matchedSkills: ['Figma'], missingSkills: ['Recherche utilisateur'], importantKeywords: ['Produit', 'Tests'], suggestions: ['Ajoutez un exemple de test utilisateur.'] }

describe('jobAnalysisController', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects an empty offer before database access', async () => {
    const next = vi.fn()
    await analyzeJob({ auth: { sub: userId }, body: { resumeId, jobDescription: '' } }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 400, details: { jobDescription: expect.any(String) } })
    expect(requireDatabase).not.toHaveBeenCalled()
  })

  it('returns 404 when the resume does not exist', async () => {
    requireDatabase.mockReturnValue({ query: vi.fn().mockResolvedValue({ rows: [] }) })
    const next = vi.fn()
    await analyzeJob({ auth: { sub: userId }, body }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 404, message: 'CV introuvable.' })
  })

  it('does not analyze a resume owned by another user', async () => {
    const database = { query: vi.fn().mockResolvedValue({ rows: [] }) }
    requireDatabase.mockReturnValue(database)
    const next = vi.fn()
    await analyzeJob({ auth: { sub: otherUserId }, body }, createResponse(), next)
    expect(database.query.mock.calls[0][1]).toEqual([resumeId, otherUserId])
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 404 })
  })

  it('returns an invalid AI response as a controlled error', async () => {
    const database = { query: vi.fn().mockResolvedValueOnce({ rows: [{ id_resume: resumeId, title_resume: 'CV' }] }).mockResolvedValue({ rows: [] }) }
    requireDatabase.mockReturnValue(database)
    analyzeJobDescription.mockRejectedValue(new ApiError(502, 'Le service d’analyse a renvoyé une réponse invalide.'))
    const next = vi.fn()
    await analyzeJob({ auth: { sub: userId }, body }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 502 })
  })

  it('returns a structured successful analysis without modifying the resume', async () => {
    const database = { query: vi.fn().mockResolvedValueOnce({ rows: [{ id_resume: resumeId, title_resume: 'CV', job_title: 'Designer' }] }).mockResolvedValue({ rows: [] }) }
    requireDatabase.mockReturnValue(database)
    analyzeJobDescription.mockResolvedValue(validAnalysis)
    const res = createResponse()
    await analyzeJob({ auth: { sub: userId }, body }, res, vi.fn())
    expect(analyzeJobDescription).toHaveBeenCalledWith(expect.objectContaining({ jobDescription: body.jobDescription, resume: expect.objectContaining({ id_resume: resumeId }) }))
    expect(res.json).toHaveBeenCalledWith({ analysis: validAnalysis })
    expect(database.query.mock.calls).toHaveLength(5)
  })
})
