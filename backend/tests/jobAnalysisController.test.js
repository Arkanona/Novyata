import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createResponse } from './helpers.js'

vi.mock('../src/config/database.js', () => ({ requireDatabase: vi.fn() }))
vi.mock('../src/services/jobAnalysisService.js', () => ({ analyzeJobDescription: vi.fn() }))
vi.mock('../src/services/aiUsageService.js', () => ({ assertAiQuota: vi.fn(), consumeAiQuota: vi.fn(), runWithAiQuota: vi.fn(async (_db, _user, _feature, work) => work({ plan: 'free', onRequestStart: vi.fn() })) }))

import { requireDatabase } from '../src/config/database.js'
import { analyzeJobDescription } from '../src/services/jobAnalysisService.js'
import { analyzeJob } from '../src/controllers/jobAnalysisController.js'
import ApiError from '../src/utils/ApiError.js'

const userId = '8b74e3e1-64b4-46f1-bfd8-c50a174cf908'
const otherUserId = '3f6070dc-e2c2-48e0-9089-a07155fbec2f'
const resumeId = 'f8c5d2f2-6ff2-43d2-9e4f-5443200f6d4b'
const body = { resumeId, jobDescription: 'Nous recherchons un Product Designer maîtrisant Figma, la recherche utilisateur et les tests.' }
const validAnalysis = { matchScore: 72, requirements: [], strongMatches: [], partialMatches: [], importantMissingSkills: [], optionalMissingSkills: [], importantKeywords: ['Produit', 'Tests'], suggestions: ['Ajoutez un exemple de test utilisateur.'], scoreExplanation: 'Analyse pondérée.' }

describe('jobAnalysisController', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects an empty offer before database access', async () => {
    const next = vi.fn()
    await analyzeJob({ auth: { sub: userId }, body: { resumeId, jobDescription: '' } }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 400, details: { jobDescription: expect.any(String) } })
    expect(requireDatabase).not.toHaveBeenCalled()
  })

  it('rejects an oversized company or job label instead of clipping it', async () => {
    const next = vi.fn()
    await analyzeJob({ auth: { sub: userId }, body: { ...body, companyName: 'x'.repeat(161) } }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 400, details: { companyName: expect.any(String) } })
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
    const database = { query: vi.fn().mockResolvedValueOnce({ rows: [{ id_resume: resumeId, title_resume: 'CV', job_title: 'Designer' }] }).mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ id_job_analysis: 'aa8dc2f2-6ff2-43d2-9e4f-5443200f6d4b', created_at: '2026-01-01', updated_at: '2026-01-01' }] }) }
    requireDatabase.mockReturnValue(database)
    analyzeJobDescription.mockResolvedValue(validAnalysis)
    const res = createResponse()
    await analyzeJob({ auth: { sub: userId }, body }, res, vi.fn())
    expect(analyzeJobDescription).toHaveBeenCalledWith(expect.objectContaining({ jobDescription: body.jobDescription, resume: expect.objectContaining({ id_resume: resumeId }) }))
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith({ analysis: expect.objectContaining({ ...validAnalysis, id_job_analysis: 'aa8dc2f2-6ff2-43d2-9e4f-5443200f6d4b' }) })
    expect(database.query.mock.calls).toHaveLength(6)
    expect(database.query.mock.calls[5][0]).toMatch(/insert into job_analyses/i)
    expect(database.query.mock.calls[5][1]).toEqual([userId, resumeId, null, 'Designer', body.jobDescription, 72, JSON.stringify(validAnalysis)])
    expect(JSON.parse(database.query.mock.calls[5][1][6])).toEqual(validAnalysis)
  })

  it('does not save an analysis when OpenAI fails', async () => {
    const database = { query: vi.fn().mockResolvedValueOnce({ rows: [{ id_resume: resumeId, title_resume: 'CV' }] }).mockResolvedValue({ rows: [] }) }
    requireDatabase.mockReturnValue(database)
    analyzeJobDescription.mockRejectedValue(new ApiError(502, 'Le service d’analyse est temporairement indisponible.'))
    const next = vi.fn()
    await analyzeJob({ auth: { sub: userId }, body }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 502 })
    expect(database.query.mock.calls.some(([sql]) => /insert into job_analyses/i.test(sql))).toBe(false)
  })

  it('does not save an analysis when OpenAI reports a truncated response', async () => {
    const database = { query: vi.fn().mockResolvedValueOnce({ rows: [{ id_resume: resumeId, title_resume: 'CV' }] }).mockResolvedValue({ rows: [] }) }
    requireDatabase.mockReturnValue(database)
    analyzeJobDescription.mockRejectedValue(new ApiError(502, 'La génération de l’analyse a atteint sa limite. Réessayez dans quelques instants.'))
    const next = vi.fn()
    await analyzeJob({ auth: { sub: userId }, body }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 502, message: 'La génération de l’analyse a atteint sa limite. Réessayez dans quelques instants.' })
    expect(database.query.mock.calls.some(([sql]) => /insert into job_analyses/i.test(sql))).toBe(false)
  })
})
