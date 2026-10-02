import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createResponse } from './helpers.js'

vi.mock('../src/config/database.js', () => ({ requireDatabase: vi.fn() }))
import { requireDatabase } from '../src/config/database.js'
import { listActivity } from '../src/controllers/activityController.js'

const userId = '8b74e3e1-64b4-46f1-bfd8-c50a174cf908'

describe('activityController', () => {
  beforeEach(() => vi.clearAllMocks())

  it('keeps the unified history restricted to Pro accounts', async () => {
    const database = { query: vi.fn().mockResolvedValueOnce({ rows: [{ plan: 'free' }] }) }
    requireDatabase.mockReturnValue(database)
    const next = vi.fn()
    await listActivity({ auth: { sub: userId } }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 403, details: { upgrade: true } })
    expect(database.query).toHaveBeenCalledTimes(1)
  })

  it('collects only owned activity and returns links without exposing document contents', async () => {
    const now = '2026-06-10T12:00:00.000Z'
    const database = { query: vi.fn()
      .mockResolvedValueOnce({ rows: [{ plan: 'pro' }] })
      .mockResolvedValueOnce({ rows: [{ id_job_analysis: 'analysis-1', company_name: 'Novyata', job_title: 'Designer', created_at: now }] })
      .mockResolvedValueOnce({ rows: [{ id_cover_letter: 'letter-1', title: 'Ma lettre', company_name: 'CloudNova', job_title: 'Product Designer', content: 'private text', created_at: now }] })
      .mockResolvedValueOnce({ rows: [{ id_resume: 'resume-1', title_resume: 'Variante React', job_title: 'Développeuse', updated_at: now }] })
      .mockResolvedValueOnce({ rows: [{ id_interview_session: 'session-1', id_application: 'application-1', company_name: 'Novyata', job_title: 'Designer', status: 'completed', exchanges: ['private'], created_at: now }] })
      .mockResolvedValueOnce({ rows: [{ id_followup: 'followup-1', id_application: 'application-1', company_name: 'Novyata', job_title: 'Designer', type: 'Remerciement', content: 'private text', created_at: now }] }) }
    requireDatabase.mockReturnValue(database)
    const res = createResponse()
    await listActivity({ auth: { sub: userId } }, res, vi.fn())
    const items = res.json.mock.calls[0][0].activity
    expect(items.map((item) => item.kind)).toEqual(['Analyse d’offre', 'Lettre de motivation', 'Variante de CV', 'Simulation d’entretien', 'Remerciement'])
    expect(items[0]).toMatchObject({ title: 'Novyata', href: '/analyses/analysis-1' })
    expect(items[1].href).toBe('/lettres/letter-1')
    expect(items[3].href).toBe('/candidatures/application-1')
    expect(JSON.stringify(items)).not.toContain('private text')
    expect(database.query.mock.calls.slice(1).every(([, params]) => params[0] === userId)).toBe(true)
  })
})
