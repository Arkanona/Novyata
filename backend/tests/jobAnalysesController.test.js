import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createResponse } from './helpers.js'

vi.mock('../src/config/database.js', () => ({ requireDatabase: vi.fn() }))

import { requireDatabase } from '../src/config/database.js'
import { deleteJobAnalysis, getJobAnalysis, listJobAnalyses } from '../src/controllers/jobAnalysesController.js'

const userId = '8b74e3e1-64b4-46f1-bfd8-c50a174cf908'
const otherUserId = '3f6070dc-e2c2-48e0-9089-a07155fbec2f'
const analysisId = 'aa8dc2f2-6ff2-43d2-9e4f-5443200f6d4b'
const row = { id_job_analysis: analysisId, id_resume: 'f8c5d2f2-6ff2-43d2-9e4f-5443200f6d4b', title_resume: 'CV Produit', company_name: 'Novyata', job_title: 'Product Designer', job_description: 'Offre test', match_score: 82, analysis_result: { matchScore: 82, strongMatches: [] }, created_at: '2026-01-01', updated_at: '2026-01-01' }

describe('jobAnalysesController', () => {
  beforeEach(() => vi.clearAllMocks())
  it('lists only the authenticated user analyses', async () => {
    const database = { query: vi.fn().mockResolvedValue({ rows: [row] }) }; requireDatabase.mockReturnValue(database)
    const res = createResponse(); await listJobAnalyses({ auth: { sub: userId } }, res, vi.fn())
    expect(database.query.mock.calls[0][1]).toEqual([userId]); expect(res.json.mock.calls[0][0].job_analyses[0]).toMatchObject({ id_job_analysis: analysisId, title_resume: 'CV Produit' })
  })
  it('retrieves an owned saved analysis without invoking OpenAI', async () => {
    const database = { query: vi.fn().mockResolvedValue({ rows: [row] }) }; requireDatabase.mockReturnValue(database)
    const res = createResponse(); await getJobAnalysis({ auth: { sub: userId }, params: { id: analysisId } }, res, vi.fn())
    expect(database.query.mock.calls[0][1]).toEqual([analysisId, userId]); expect(res.json.mock.calls[0][0].job_analysis.analysis).toMatchObject({ matchScore: 82, id_job_analysis: analysisId })
  })
  it('hides an analysis owned by another user', async () => {
    requireDatabase.mockReturnValue({ query: vi.fn().mockResolvedValue({ rows: [] }) }); const next = vi.fn()
    await getJobAnalysis({ auth: { sub: otherUserId }, params: { id: analysisId } }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 404, message: 'Analyse introuvable.' })
  })
  it('deletes only an owned analysis', async () => {
    const database = { query: vi.fn().mockResolvedValue({ rows: [{ id_job_analysis: analysisId }] }) }; requireDatabase.mockReturnValue(database)
    const res = createResponse(); await deleteJobAnalysis({ auth: { sub: userId }, params: { id: analysisId } }, res, vi.fn())
    expect(database.query.mock.calls[0][1]).toEqual([analysisId, userId]); expect(res.status).toHaveBeenCalledWith(204)
  })
})
