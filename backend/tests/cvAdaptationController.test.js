import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createResponse } from './helpers.js'

vi.mock('../src/config/database.js', () => ({ requireDatabase: vi.fn() }))
vi.mock('../src/services/cvAdaptationService.js', () => ({ proposeCvAdaptation: vi.fn(), validateAdaptation: vi.fn() }))

import { requireDatabase } from '../src/config/database.js'
import { proposeCvAdaptation, validateAdaptation } from '../src/services/cvAdaptationService.js'
import { applyCvAdaptation, createAdaptationProposals } from '../src/controllers/cvAdaptationController.js'
import ApiError from '../src/utils/ApiError.js'

const userId = '8b74e3e1-64b4-46f1-bfd8-c50a174cf908'
const otherUserId = '3f6070dc-e2c2-48e0-9089-a07155fbec2f'
const analysisId = 'aa8dc2f2-6ff2-43d2-9e4f-5443200f6d4b'
const resumeId = 'f8c5d2f2-6ff2-43d2-9e4f-5443200f6d4b'
const analysis = { id_job_analysis: analysisId, id_resume: resumeId, company_name: 'CloudNova', job_title: 'Développeur Full-Stack', job_description: 'Offre test', analysis_result: { importantKeywords: ['React'] } }
const resume = { id_resume: resumeId, title_resume: 'CV Développeur Full-Stack', job_title: 'Développeur Full-Stack', first_name: 'Marie', last_name: 'Laurent', email: 'marie@example.test', phone: '0600000000', city: 'Lyon', summary: 'Développeuse web.', template_key: 'modern', accent_color: '#3F6B5B', font_size: 'large' }
const experience = { job_title: 'Développeuse', company: 'Novyata', city: 'Lyon', start_date: '2024-01-01', end_date: null, is_current: true, description: 'Création de fonctionnalités React.' }
const proposal = { id: 'experience-0', field: 'experience', targetIndex: 0, currentText: experience.description, proposedText: 'Création de fonctionnalités React pour des parcours produit.', reason: 'Précise un mot-clé cohérent.' }

function sourceDatabase({ analysisRows = [analysis], resumeRows = [resume] } = {}) {
  return { query: vi.fn().mockResolvedValueOnce({ rows: analysisRows }).mockResolvedValueOnce({ rows: resumeRows }).mockResolvedValueOnce({ rows: [experience] }).mockResolvedValueOnce({ rows: [{ degree: 'Master', school: 'École', city: 'Lyon', start_date: '2020-01-01', end_date: '2022-01-01', description: null }] }).mockResolvedValueOnce({ rows: [{ name: 'React', level: 'Avancé' }] }).mockResolvedValueOnce({ rows: [{ name: 'Anglais', level: 'B2' }] }) }
}

describe('cvAdaptationController', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 404 for a missing or another user analysis', async () => {
    const database = sourceDatabase({ analysisRows: [] }); requireDatabase.mockReturnValue(database)
    const next = vi.fn()
    await createAdaptationProposals({ auth: { sub: otherUserId }, params: { id: analysisId } }, createResponse(), next)
    expect(database.query.mock.calls[0][1]).toEqual([analysisId, otherUserId])
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 404, message: 'Analyse introuvable.' })
    expect(proposeCvAdaptation).not.toHaveBeenCalled()
  })

  it('returns 404 when the original CV no longer exists', async () => {
    requireDatabase.mockReturnValue(sourceDatabase({ resumeRows: [] }))
    const next = vi.fn()
    await createAdaptationProposals({ auth: { sub: userId }, params: { id: analysisId } }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 404, message: 'CV introuvable.' })
  })

  it('keeps the original CV unchanged while requesting proposals', async () => {
    const database = sourceDatabase(); requireDatabase.mockReturnValue(database)
    proposeCvAdaptation.mockResolvedValue({ proposals: [proposal] })
    const res = createResponse()
    await createAdaptationProposals({ auth: { sub: userId }, params: { id: analysisId } }, res, vi.fn())
    expect(res.json).toHaveBeenCalledWith({ adaptation: { proposals: [proposal] } })
    expect(database.query.mock.calls.every(([sql]) => !/insert|update|delete/i.test(sql))).toBe(true)
  })

  it('returns an invalid AI proposal as a controlled error', async () => {
    requireDatabase.mockReturnValue(sourceDatabase())
    proposeCvAdaptation.mockRejectedValue(new ApiError(502, 'Le service d’adaptation a renvoyé une réponse invalide.'))
    const next = vi.fn()
    await createAdaptationProposals({ auth: { sub: userId }, params: { id: analysisId } }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 502 })
  })

  it('copies the CV preferences and applies only accepted proposals', async () => {
    const database = sourceDatabase()
    const client = { query: vi.fn().mockResolvedValueOnce({}).mockResolvedValueOnce({ rows: [{ id_resume: '3e2c3d2f-6ff2-43d2-9e4f-5443200f6d4b' }] }).mockResolvedValue({}), release: vi.fn() }
    database.connect = vi.fn().mockResolvedValue(client); requireDatabase.mockReturnValue(database)
    validateAdaptation.mockReturnValue({ proposals: [proposal, { id: 'summary-0', field: 'summary', targetIndex: 0, currentText: resume.summary, proposedText: 'Résumé non accepté.', reason: 'Test.' }] })
    const res = createResponse()
    await applyCvAdaptation({ auth: { sub: userId }, params: { id: analysisId }, body: { proposals: [proposal], acceptedIds: ['experience-0'] } }, res, vi.fn())
    expect(client.query).toHaveBeenCalledWith(expect.stringMatching(/insert into resumes/i), expect.arrayContaining([userId, expect.stringContaining('CloudNova'), resume.template_key, resume.accent_color, resume.font_size]))
    expect(client.query).toHaveBeenCalledWith(expect.stringMatching(/insert into experiences/i), expect.arrayContaining([expect.any(String), experience.job_title, experience.company, experience.city, experience.start_date, experience.end_date, experience.is_current, proposal.proposedText]))
    expect(client.query).toHaveBeenCalledWith(expect.stringMatching(/insert into resumes/i), expect.arrayContaining([resume.summary]))
    expect(res.status).toHaveBeenCalledWith(201)
    expect(client.query).toHaveBeenCalledWith('commit')
    expect(client.release).toHaveBeenCalled()
  })
})
