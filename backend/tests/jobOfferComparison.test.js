import { describe, expect, it, vi } from 'vitest'
import { summarizeSavedOffer } from '../src/utils/jobOfferComparison.js'
import { createResponse } from './helpers.js'

vi.mock('../src/config/database.js', () => ({ requireDatabase: vi.fn() }))
import { requireDatabase } from '../src/config/database.js'
import { compareSavedOffers } from '../src/controllers/jobOfferComparisonController.js'

const userId = '8b74e3e1-64b4-46f1-bfd8-c50a174cf908'
const ids = ['f8c5d2f2-6ff2-43d2-9e4f-5443200f6d4b', 'aa8dc2f2-6ff2-43d2-9e4f-5443200f6d4b']

describe('saved job offer comparison', () => {
  it('extracts only explicit offer facts and marks absent values as absent downstream', () => {
    const result = summarizeSavedOffer({ id_job_analysis: ids[0], company_name: 'Acme', job_title: 'Analyste', job_description: 'Localisation : Lyon\nContrat : CDI\nTélétravail hybride\nSalaire : 42 000 €\nAvantages : tickets restaurant et mutuelle', match_score: 72, analysis_result: { requirements: [{ name: 'SQL' }, { name: 'Power BI' }] } })
    expect(result).toMatchObject({ companyName: 'Acme', location: 'Lyon', contractType: 'CDI', salary: '42 000 €', matchScore: 72, importantRequirements: ['SQL', 'Power BI'] })
    expect(result.remote).toContain('Télétravail hybride')
    expect(result.explicitBenefits).toEqual(['Avantages : tickets restaurant et mutuelle'])
  })

  it('does not infer missing information', () => {
    const result = summarizeSavedOffer({ id_job_analysis: ids[0], job_description: 'Poste intéressant.', match_score: null, analysis_result: {} })
    expect(result).toMatchObject({ location: '', contractType: '', remote: '', salary: '', importantRequirements: [], explicitBenefits: [], matchScore: null })
  })

  it('requires two or three distinct valid analyses', async () => {
    const next = vi.fn()
    await compareSavedOffers({ auth: { sub: userId }, body: { analysisIds: [ids[0]] } }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 400 })
    expect(requireDatabase).not.toHaveBeenCalled()
  })

  it('limits access to analyses owned by the current user and preserves selected order', async () => {
    const rows = [
      { id_job_analysis: ids[1], company_name: 'B', job_title: 'Designer', job_description: '', match_score: 40, analysis_result: {}, plan: 'pro' },
      { id_job_analysis: ids[0], company_name: 'A', job_title: 'Analyste', job_description: '', match_score: 80, analysis_result: {}, plan: 'pro' },
    ]
    const database = { query: vi.fn().mockResolvedValue({ rows }) }
    requireDatabase.mockReturnValue(database)
    const res = createResponse()
    await compareSavedOffers({ auth: { sub: userId }, body: { analysisIds: ids } }, res, vi.fn())
    expect(database.query.mock.calls[0][1]).toEqual([userId, ids])
    expect(database.query.mock.calls[0][0]).toContain('id_user=$1')
    expect(res.json.mock.calls[0][0].offers.map((offer) => offer.companyName)).toEqual(['A', 'B'])
  })

  it('returns 404 if one selected analysis is missing or belongs to another user', async () => {
    const database = { query: vi.fn().mockResolvedValue({ rows: [{ id_job_analysis: ids[0], job_description: '', analysis_result: {} }] }) }
    requireDatabase.mockReturnValue(database)
    const next = vi.fn()
    await compareSavedOffers({ auth: { sub: userId }, body: { analysisIds: ids } }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 404 })
  })
})
