import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createResponse } from './helpers.js'
vi.mock('../src/config/database.js', () => ({ requireDatabase: vi.fn() }))
vi.mock('../src/services/aiUsageService.js', () => ({ assertAiQuota: vi.fn(), consumeAiQuota: vi.fn() }))
vi.mock('../src/services/interviewSimulationService.js', () => ({ simulateInterview: vi.fn() }))
import { requireDatabase } from '../src/config/database.js'
import { assertAiQuota, consumeAiQuota } from '../src/services/aiUsageService.js'
import { simulateInterview } from '../src/services/interviewSimulationService.js'
import { completeInterviewSimulation, createInterviewSimulation } from '../src/controllers/interviewSimulationController.js'
import ApiError from '../src/utils/ApiError.js'
const user = '8b74e3e1-64b4-46f1-bfd8-c50a174cf908'; const app = '7b74e3e1-64b4-46f1-bfd8-c50a174cf908'
describe('interviewSimulationController', () => { beforeEach(() => { vi.clearAllMocks(); simulateInterview.mockResolvedValue({ question: 'Parlez-moi de votre parcours.', feedback: { positives: ['Réponse structurée'], missing: 'Un exemple concret.', suggestion: 'Ajoutez une réalisation.' } }) })
  it('starts a protected simulation, consumes its dedicated quota and saves the exchange', async () => { const query = vi.fn().mockResolvedValueOnce({ rows: [{ company_name: 'Novyata', job_title: 'Designer', id_resume: null }] }).mockResolvedValueOnce({ rows: [{ id_interview_session: app, exchanges: [], created_at: '2026-01-01', updated_at: '2026-01-01' }] }); requireDatabase.mockReturnValue({ query }); const res = createResponse(); const next = vi.fn(); await createInterviewSimulation({ params: { id: app }, auth: { sub: user }, body: {} }, res, next); expect(next).not.toHaveBeenCalled(); expect(assertAiQuota).toHaveBeenCalled(); expect(consumeAiQuota).toHaveBeenCalled(); expect(query.mock.calls[1][0]).toContain('insert into interview_sessions'); expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ simulation: expect.objectContaining({ question: expect.any(String) }) })) })
  it('appends an authenticated answer and the next question to the existing persisted session', async () => {
    const sessionId = '1b74e3e1-64b4-46f1-bfd8-c50a174cf908'
    const previousExchanges = [{ question: 'Présentez-vous.', answer: '', feedback: null }]
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [{ company_name: 'Novyata', job_title: 'Designer', id_resume: null, id_job_analysis: null }] })
      .mockResolvedValueOnce({ rows: [{ id_interview_session: sessionId, status: 'in_progress', exchanges: previousExchanges }] })
      .mockResolvedValueOnce({ rows: [{ id_interview_session: sessionId }] })
      .mockResolvedValueOnce({ rows: [{ id_interview_session: sessionId, status: 'in_progress', exchanges: [{ ...previousExchanges[0], answer: 'J’ai piloté un test utilisateur.', feedback: { positives: ['Réponse structurée'] } }, { question: 'Parlez-moi de votre parcours.', answer: '', feedback: null }], progress: 2 }] })
    requireDatabase.mockReturnValue({ query })
    const res = createResponse()
    await createInterviewSimulation({ params: { id: app }, auth: { sub: user }, body: { sessionId, answer: '  J’ai piloté un test utilisateur.  ' } }, res, vi.fn())

    expect(query.mock.calls[2][0]).toContain('update interview_sessions set exchanges')
    expect(JSON.parse(query.mock.calls[2][1][0])).toEqual([expect.objectContaining({ answer: 'J’ai piloté un test utilisateur.', question: 'Présentez-vous.', feedback: null })])
    expect(JSON.parse(query.mock.calls[3][1][0])).toEqual([
      expect.objectContaining({ answer: 'J’ai piloté un test utilisateur.', question: 'Présentez-vous.', feedback: expect.any(Object) }),
      expect.objectContaining({ answer: '', question: 'Parlez-moi de votre parcours.', feedback: null }),
    ])
    expect(res.json.mock.calls[0][0].session.progress).toBe(2)
  })
  it('limits the AI context to the linked CV and useful analysis fields', async () => { const resume = '2b74e3e1-64b4-46f1-bfd8-c50a174cf908'; const analysis = '3b74e3e1-64b4-46f1-bfd8-c50a174cf908'; const query = vi.fn().mockResolvedValueOnce({ rows: [{ company_name: 'Novyata', job_title: 'Designer', id_resume: resume, id_job_analysis: analysis, notes: 'Échange initial' }] }).mockResolvedValueOnce({ rows: [{ job_title: 'Product designer', summary: 'Conçoit des interfaces.' }] }).mockResolvedValueOnce({ rows: [{ job_description: 'Offre détaillée', analysis_result: { strongMatches: [{ name: 'Figma', evidence: 'Ne pas transmettre' }], partialMatches: [{ name: 'Accessibilité' }], importantMissingSkills: ['Tests'], importantKeywords: ['SaaS'], scoreExplanation: 'Ne pas transmettre' } }] }).mockResolvedValueOnce({ rows: [{ id_interview_session: app, status: 'in_progress', exchanges: [] }] }); requireDatabase.mockReturnValue({ query }); await createInterviewSimulation({ params: { id: app }, auth: { sub: user }, body: {} }, createResponse(), vi.fn()); expect(simulateInterview).toHaveBeenCalledWith(expect.objectContaining({ company: 'Novyata', cv: { job_title: 'Product designer', summary: 'Conçoit des interfaces.' }, offer: { jobDescription: 'Offre détaillée', analysis: { strongMatches: ['Figma'], partialMatches: ['Accessibilité'], importantMissingSkills: ['Tests'], importantKeywords: ['SaaS'] } } })); expect(simulateInterview.mock.calls[0][0].offer.analysis).not.toHaveProperty('scoreExplanation') })
  it('derives advanced STAR coaching from the authenticated user plan', async () => { assertAiQuota.mockResolvedValueOnce({ plan: 'pro' }); const query = vi.fn().mockResolvedValueOnce({ rows: [{ company_name: 'Novyata', job_title: 'Designer', id_resume: null, id_job_analysis: null }] }).mockResolvedValueOnce({ rows: [{ id_interview_session: app, exchanges: [], created_at: '2026-01-01', updated_at: '2026-01-01' }] }); requireDatabase.mockReturnValue({ query }); await createInterviewSimulation({ params: { id: app }, auth: { sub: user }, body: { tier: 'free' } }, createResponse(), vi.fn()); expect(simulateInterview.mock.calls[0][0].tier).toBe('pro') })
  it('uses saved search preferences as preferences, not as CV facts', async () => {
    const preferences = { roles: 'Data Analyst', location: 'Lyon', contract_type: 'CDI' }
    const query = vi.fn().mockResolvedValueOnce({ rows: [{ company_name: 'InsightFlow', job_title: 'Data Analyst', id_resume: null, id_job_analysis: null, job_search_preferences: preferences }] }).mockResolvedValueOnce({ rows: [{ id_interview_session: app, exchanges: [] }] })
    requireDatabase.mockReturnValue({ query })
    await createInterviewSimulation({ params: { id: app }, auth: { sub: user }, body: {} }, createResponse(), vi.fn())
    expect(simulateInterview).toHaveBeenCalledWith(expect.objectContaining({ searchProfile: preferences }))
  })
  it('rejects an empty answer when continuing a saved session', async () => {
    const sessionId = '1b74e3e1-64b4-46f1-bfd8-c50a174cf908'
    requireDatabase.mockReturnValue({ query: vi.fn().mockResolvedValueOnce({ rows: [{ company_name: 'Novyata', job_title: 'Designer', id_resume: null }] }).mockResolvedValueOnce({ rows: [{ id_interview_session: sessionId, status: 'in_progress', exchanges: [{ question: 'Présentez-vous.', answer: '', feedback: null }] }] }) })
    const next = vi.fn()
    await createInterviewSimulation({ params: { id: app }, auth: { sub: user }, body: { sessionId, answer: '  ' } }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 400 })
    expect(simulateInterview).not.toHaveBeenCalled()
  })
  it('persists a submitted answer before requesting feedback so a provider failure cannot lose it', async () => {
    const sessionId = '1b74e3e1-64b4-46f1-bfd8-c50a174cf908'
    const query = vi.fn().mockResolvedValueOnce({ rows: [{ company_name: 'Novyata', job_title: 'Designer', id_resume: null }] })
      .mockResolvedValueOnce({ rows: [{ id_interview_session: sessionId, status: 'in_progress', exchanges: [{ question: 'Présentez-vous.', answer: '', feedback: null }] }] })
      .mockResolvedValueOnce({ rows: [{ id_interview_session: sessionId }] })
    requireDatabase.mockReturnValue({ query })
    simulateInterview.mockRejectedValueOnce(new ApiError(502, 'Service temporairement indisponible.'))
    const next = vi.fn()
    await createInterviewSimulation({ params: { id: app }, auth: { sub: user }, body: { sessionId, answer: 'Mon expérience en analyse.' } }, createResponse(), next)
    expect(JSON.parse(query.mock.calls[2][1][0])).toEqual([expect.objectContaining({ question: 'Présentez-vous.', answer: 'Mon expérience en analyse.', feedback: null })])
    expect(consumeAiQuota).not.toHaveBeenCalled()
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 502 })
  })
  it('refuses a simulation for another user application', async () => { requireDatabase.mockReturnValue({ query: vi.fn().mockResolvedValue({ rows: [] }) }); const next = vi.fn(); await createInterviewSimulation({ params: { id: app }, auth: { sub: user }, body: {} }, createResponse(), next); expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 404 }); expect(simulateInterview).not.toHaveBeenCalled() })
  it('does not turn an unknown session into a new simulation', async () => { const query = vi.fn().mockResolvedValueOnce({ rows: [{ company_name: 'Novyata', job_title: 'Designer', id_resume: null, id_job_analysis: null }] }).mockResolvedValueOnce({ rows: [] }); requireDatabase.mockReturnValue({ query }); const next = vi.fn(); await createInterviewSimulation({ params: { id: app }, auth: { sub: user }, body: { sessionId: '1b74e3e1-64b4-46f1-bfd8-c50a174cf908' } }, createResponse(), next); expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 404 }); expect(simulateInterview).not.toHaveBeenCalled() })
  it('stops before OpenAI when the simulation quota is exhausted', async () => { requireDatabase.mockReturnValue({ query: vi.fn().mockResolvedValue({ rows: [{ company_name: 'Novyata', job_title: 'Designer', id_resume: null, id_job_analysis: null }] }) }); assertAiQuota.mockRejectedValueOnce(new ApiError(429, 'Quota atteint.')); const next = vi.fn(); await createInterviewSimulation({ params: { id: app }, auth: { sub: user }, body: {} }, createResponse(), next); expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 429 }); expect(simulateInterview).not.toHaveBeenCalled() })
  it('marks only the owner’s active session as completed', async () => { const query = vi.fn().mockResolvedValue({ rows: [{ id_interview_session: app, status: 'completed', exchanges: [], progress: 1 }] }); requireDatabase.mockReturnValue({ query }); const res = createResponse(); await completeInterviewSimulation({ params: { id: app, sessionId: '1b74e3e1-64b4-46f1-bfd8-c50a174cf908' }, auth: { sub: user } }, res, vi.fn()); expect(query.mock.calls[0][0]).toContain("status = 'completed'"); expect(query.mock.calls[0][1]).toEqual([ '1b74e3e1-64b4-46f1-bfd8-c50a174cf908', app, user ]); expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ session: expect.objectContaining({ status: 'completed' }) })) })
})
