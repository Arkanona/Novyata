import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createResponse } from './helpers.js'

vi.mock('../src/config/database.js', () => ({ requireDatabase: vi.fn() }))
vi.mock('../src/services/aiUsageService.js', () => ({ assertAiQuota: vi.fn(), consumeAiQuota: vi.fn(), runWithAiQuota: vi.fn(async (_db, _user, _feature, work) => work({ plan: 'free', onRequestStart: vi.fn() })) }))
vi.mock('../src/services/interviewPreparationService.js', () => ({ generateInterviewPreparation: vi.fn() }))

import { requireDatabase } from '../src/config/database.js'
import { runWithAiQuota } from '../src/services/aiUsageService.js'
import { generateInterviewPreparation } from '../src/services/interviewPreparationService.js'
import { createInterviewPreparation } from '../src/controllers/interviewPreparationController.js'

const userId = '8b74e3e1-64b4-46f1-bfd8-c50a174cf908'
const applicationId = 'aa8dc2f2-6ff2-43d2-9e4f-5443200f6d4b'
const resumeId = 'f8c5d2f2-6ff2-43d2-9e4f-5443200f6d4b'

describe('interviewPreparationController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    generateInterviewPreparation.mockResolvedValue({ questions: [{ category: 'rh', question: 'Pourquoi ce poste ?' }, { category: 'technique', question: 'Comment procédez-vous ?' }, { category: 'comportementale', question: 'Racontez un exemple réel.' }], strengths: [], prepare: [], recruiterQuestions: [], introduction: 'Présentation réelle.' })
  })

  it('sends a compact, non-personal CV and offer context to the generator and returns the result', async () => {
    const database = { query: vi.fn()
      .mockResolvedValueOnce({ rows: [{ id_application: applicationId, id_resume: resumeId, id_job_analysis: 'analysis-id', company_name: 'CloudNova', job_title: 'Product Designer', job_search_preferences: { roles: 'Product designer', location: 'Lyon' } }] })
      .mockResolvedValueOnce({ rows: [{ job_title: 'Designer', summary: 'Profil utilisateur', email: 'private@example.test' }] })
      .mockResolvedValueOnce({ rows: [{ job_title: 'Designer UX', company: 'Studio Nova', description: 'Recherche et tests utilisateur' }] })
      .mockResolvedValueOnce({ rows: [{ degree: 'Master design', school: 'École Nova', description: 'Parcours produit' }] })
      .mockResolvedValueOnce({ rows: [{ name: 'Figma' }, { name: 'Recherche utilisateur' }] })
      .mockResolvedValueOnce({ rows: [{ name: 'Anglais', level: 'Courant' }] })
      .mockResolvedValueOnce({ rows: [{ job_description: 'Offre Product Designer', analysis_result: { requirements: [{ id: 'req_1', name: 'Figma' }], strongMatches: [{ requirementId: 'req_1' }], importantKeywords: ['Figma'] } }] }) }
    requireDatabase.mockReturnValue(database)
    const res = createResponse(); const next = vi.fn()

    await createInterviewPreparation({ params: { id: applicationId }, auth: { sub: userId } }, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(database.query.mock.calls[0][1]).toEqual([applicationId, userId])
    expect(generateInterviewPreparation).toHaveBeenCalledWith({
      company: 'CloudNova', jobTitle: 'Product Designer', searchProfile: { roles: 'Product designer', location: 'Lyon' },
      cv: { jobTitle: 'Designer', summary: 'Profil utilisateur', experiences: [{ role: 'Designer UX', organization: 'Studio Nova', description: 'Recherche et tests utilisateur' }], education: [{ degree: 'Master design', school: 'École Nova', description: 'Parcours produit' }], skills: ['Figma', 'Recherche utilisateur'], languages: [{ name: 'Anglais', level: 'Courant' }] },
      offer: { jobDescription: 'Offre Product Designer', analysis: { strongMatches: ['Figma'], partialMatches: [], importantMissingSkills: [], importantKeywords: ['Figma'] } },
    }, expect.objectContaining({ onRequestStart: expect.any(Function) }))
    expect(JSON.stringify(generateInterviewPreparation.mock.calls[0][0])).not.toContain('private@example.test')
    expect(runWithAiQuota).toHaveBeenCalledOnce()
    expect(res.json).toHaveBeenCalledWith({ preparation: expect.objectContaining({ introduction: 'Présentation réelle.' }) })
  })

  it('refuses an application not owned by the user and does not call AI', async () => {
    const database = { query: vi.fn().mockResolvedValue({ rows: [] }) }
    requireDatabase.mockReturnValue(database)
    const next = vi.fn()
    await createInterviewPreparation({ params: { id: applicationId }, auth: { sub: userId } }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 404 })
    expect(database.query.mock.calls[0][1]).toEqual([applicationId, userId])
    expect(generateInterviewPreparation).not.toHaveBeenCalled()
  })

  it('requires a linked and accessible CV before using the AI quota', async () => {
    const database = { query: vi.fn().mockResolvedValueOnce({ rows: [{ id_application: applicationId, id_resume: null }] }) }
    requireDatabase.mockReturnValue(database)
    const next = vi.fn()
    await createInterviewPreparation({ params: { id: applicationId }, auth: { sub: userId } }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 400 })
    expect(runWithAiQuota).not.toHaveBeenCalled()
  })
})
