import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createResponse } from './helpers.js'

vi.mock('../src/config/database.js', () => ({ requireDatabase: vi.fn() }))
import { requireDatabase } from '../src/config/database.js'
import { getAdvancedStatistics } from '../src/controllers/advancedStatisticsController.js'

const userId = '8b74e3e1-64b4-46f1-bfd8-c50a174cf908'

describe('advancedStatisticsController', () => {
  beforeEach(() => vi.clearAllMocks())

  it('keeps advanced statistics Pro-only', async () => {
    const database = { query: vi.fn().mockResolvedValue({ rows: [{ plan: 'free' }] }) }
    requireDatabase.mockReturnValue(database)
    const next = vi.fn()
    await getAdvancedStatistics({ auth: { sub: userId }, query: {} }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 403, details: { upgrade: true } })
    expect(database.query).toHaveBeenCalledTimes(1)
  })

  it('returns descriptive, owned funnel, weekly activity, response delay and per-CV outcomes', async () => {
    const applicationDate = new Date()
    applicationDate.setUTCDate(applicationDate.getUTCDate() - 3)
    applicationDate.setUTCHours(0, 0, 0, 0)
    const responseDate = new Date()
    responseDate.setUTCDate(responseDate.getUTCDate() - 2)
    responseDate.setUTCHours(0, 0, 0, 0)
    const database = { query: vi.fn()
      .mockResolvedValueOnce({ rows: [{ plan: 'pro' }] })
      .mockResolvedValueOnce({ rows: [
        { id_application: 'app-1', id_resume: 'resume-1', status: 'Entretien', application_date: applicationDate.toISOString().slice(0, 10), created_at: applicationDate, title_resume: 'CV Produit' },
        { id_application: 'app-2', id_resume: null, status: 'Candidature envoyée', application_date: applicationDate.toISOString().slice(0, 10), created_at: applicationDate, title_resume: null },
      ] })
      .mockResolvedValueOnce({ rows: [{ id_application: 'app-1', type: 'status_change', title: 'Statut : Entretien', event_date: responseDate }] }) }
    requireDatabase.mockReturnValue(database)
    const res = createResponse()
    await getAdvancedStatistics({ auth: { sub: userId }, query: { period: '30' } }, res, vi.fn())
    const body = res.json.mock.calls[0][0]
    expect(body).toMatchObject({
      periodDays: 30,
      funnel: { applications: 2, responses: 1, interviews: 1, offers: 0, refusals: 0 },
      responseRate: 50,
      interviewRate: 50,
      averageResponseDelayDays: 1,
      responseDelaySampleSize: 1,
    })
    expect(body.outcomesByResume).toEqual(expect.arrayContaining([
      expect.objectContaining({ resumeId: 'resume-1', resumeTitle: 'CV Produit', applications: 1, responses: 1, interviews: 1 }),
      expect.objectContaining({ resumeId: null, resumeTitle: 'Sans CV associé', applications: 1 }),
    ]))
    expect(body.weeklyTrend).toHaveLength(8)
    expect(database.query.mock.calls[1][1]).toEqual([userId, 30])
    expect(database.query.mock.calls[2][1]).toEqual([userId, 30])
    expect(database.query.mock.calls[1][0]).toContain('applications.id_user = $1')
    expect(database.query.mock.calls[2][0]).toContain('applications.id_user = $1')
  })

  it('uses a supported default period when an invalid range is requested', async () => {
    const database = { query: vi.fn()
      .mockResolvedValueOnce({ rows: [{ plan: 'pro' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] }) }
    requireDatabase.mockReturnValue(database)
    const res = createResponse()
    await getAdvancedStatistics({ auth: { sub: userId }, query: { period: 'all-time' } }, res, vi.fn())
    expect(res.json.mock.calls[0][0].periodDays).toBe(90)
    expect(database.query.mock.calls[1][1]).toEqual([userId, 90])
  })
})
