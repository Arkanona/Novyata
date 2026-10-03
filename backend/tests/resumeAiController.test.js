import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createResponse } from './helpers.js'

vi.mock('../src/config/database.js', () => ({ requireDatabase: vi.fn() }))
vi.mock('../src/services/aiUsageService.js', () => ({ assertAiQuota: vi.fn(), consumeAiQuota: vi.fn(), runWithAiQuota: vi.fn(async (_db, _user, _feature, work) => work({ plan: 'free', onRequestStart: vi.fn() })) }))
vi.mock('../src/services/resumeAiService.js', () => ({ generateProfessionalSummary: vi.fn(), improveExperienceDescription: vi.fn(), improveProfessionalSummary: vi.fn() }))

import { requireDatabase } from '../src/config/database.js'
import { runWithAiQuota } from '../src/services/aiUsageService.js'
import { generateProfessionalSummary, improveExperienceDescription, improveProfessionalSummary } from '../src/services/resumeAiService.js'
import { createExperienceImprovement, createProfessionalSummary, improveResumeSummary } from '../src/controllers/resumeAiController.js'

const userId = '8b74e3e1-64b4-46f1-bfd8-c50a174cf908'
const resumeId = 'f8c5d2f2-6ff2-43d2-9e4f-5443200f6d4b'
const suggestion = 'Designer produit avec une expérience en conception et tests de parcours.'
const databaseWithResume = () => ({ query: vi.fn()
  .mockResolvedValueOnce({ rows: [{ job_title: 'Product Designer', summary: 'Profil actuel' }] })
  .mockResolvedValueOnce({ rows: [{ job_title: 'Designer UX', company: 'Studio Nova', description: 'Conception de parcours' }] })
  .mockResolvedValueOnce({ rows: [{ degree: 'Master design', school: 'École Nova', description: '' }] })
  .mockResolvedValueOnce({ rows: [{ name: 'Figma' }] }) })

describe('resumeAiController', () => {
  beforeEach(() => { vi.clearAllMocks(); generateProfessionalSummary.mockResolvedValue({ summary: suggestion }); improveProfessionalSummary.mockResolvedValue({ summary: suggestion }); improveExperienceDescription.mockResolvedValue({ description: 'Conception et tests de parcours.' }) })

  it('uses only career facts, validates ownership and consumes quota after success', async () => {
    const database = databaseWithResume(); requireDatabase.mockReturnValue(database)
    const res = createResponse(); const next = vi.fn()
    await createProfessionalSummary({ params: { id: resumeId }, auth: { sub: userId } }, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(generateProfessionalSummary).toHaveBeenCalledWith({ jobTitle: 'Product Designer', currentSummary: 'Profil actuel', experiences: [{ role: 'Designer UX', organization: 'Studio Nova', description: 'Conception de parcours' }], education: [{ degree: 'Master design', school: 'École Nova', description: '' }], skills: ['Figma'] }, expect.objectContaining({ onRequestStart: expect.any(Function) }))
    expect(JSON.stringify(generateProfessionalSummary.mock.calls[0][0])).not.toMatch(/email|phone|id_resume/i)
    expect(runWithAiQuota).toHaveBeenCalledWith(database, userId, 'resume_summary', expect.any(Function))
    expect(res.json).toHaveBeenCalledWith({ suggestion })
  })

  it('rejects an invalid ID, an unavailable CV or a blank CV without using AI', async () => {
    const next = vi.fn()
    await createProfessionalSummary({ params: { id: 'bad' }, auth: { sub: userId } }, createResponse(), next)
    expect(next.mock.calls[0][0].statusCode).toBe(400)
    requireDatabase.mockReturnValue({ query: vi.fn().mockResolvedValue({ rows: [] }) })
    const missing = vi.fn()
    await createProfessionalSummary({ params: { id: resumeId }, auth: { sub: userId } }, createResponse(), missing)
    expect(missing.mock.calls[0][0].statusCode).toBe(404)
    requireDatabase.mockReturnValue({ query: vi.fn().mockResolvedValueOnce({ rows: [{ job_title: '', summary: '' }] }).mockResolvedValue({ rows: [] }) })
    const blank = vi.fn()
    await createProfessionalSummary({ params: { id: resumeId }, auth: { sub: userId } }, createResponse(), blank)
    expect(blank.mock.calls[0][0].statusCode).toBe(400)
    expect(generateProfessionalSummary).not.toHaveBeenCalled()
    expect(runWithAiQuota).not.toHaveBeenCalled()
  })

  it('does not consume quota if the generation fails', async () => {
    requireDatabase.mockReturnValue(databaseWithResume()); generateProfessionalSummary.mockRejectedValue(new Error('Provider failure'))
    const next = vi.fn()
    await createProfessionalSummary({ params: { id: resumeId }, auth: { sub: userId } }, createResponse(), next)
    expect(next).toHaveBeenCalledOnce()
    expect(runWithAiQuota).toHaveBeenCalledOnce()
  })

  it('only returns a rewrite proposal for an owned saved experience and does not modify the database', async () => {
    const database = { query: vi.fn().mockResolvedValue({ rows: [{ job_title: 'Designer UX', company: 'Studio Nova', description: 'Création de parcours utilisateurs.' }] }) }
    requireDatabase.mockReturnValue(database)
    const res = createResponse(); const next = vi.fn()
    const experienceId = 'aa8dc2f2-6ff2-43d2-9e4f-5443200f6d4b'
    await createExperienceImprovement({ params: { id: resumeId, experienceId }, auth: { sub: userId } }, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(database.query).toHaveBeenCalledWith(expect.stringContaining('r.id_user=$2'), [resumeId, userId, experienceId])
    expect(improveExperienceDescription).toHaveBeenCalledWith({ text: 'Création de parcours utilisateurs.' }, expect.objectContaining({ onRequestStart: expect.any(Function) }))
    expect(runWithAiQuota).toHaveBeenCalledWith(database, userId, 'experience_rewrite', expect.any(Function))
    expect(res.json).toHaveBeenCalledWith({ suggestion: 'Conception et tests de parcours.' })
    expect(database.query).toHaveBeenCalledTimes(1)
  })

  it('rejects inaccessible and too-short experience text without calling AI', async () => {
    requireDatabase.mockReturnValue({ query: vi.fn().mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ description: 'Court' }] }) })
    const absent = vi.fn()
    const experienceId = 'aa8dc2f2-6ff2-43d2-9e4f-5443200f6d4b'
    await createExperienceImprovement({ params: { id: resumeId, experienceId }, auth: { sub: userId } }, createResponse(), absent)
    expect(absent.mock.calls[0][0].statusCode).toBe(404)
    const short = vi.fn()
    await createExperienceImprovement({ params: { id: resumeId, experienceId }, auth: { sub: userId } }, createResponse(), short)
    expect(short.mock.calls[0][0].statusCode).toBe(400)
    expect(improveExperienceDescription).not.toHaveBeenCalled()
  })

  it('improves user-provided draft summary after checking ownership and never saves it implicitly', async () => {
    const database = { query: vi.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }) }
    requireDatabase.mockReturnValue(database)
    const res = createResponse(); const next = vi.fn()
    await improveResumeSummary({ params: { id: resumeId }, body: { text: 'Résumé brouillon suffisamment long pour demander une correction.' }, auth: { sub: userId } }, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(improveProfessionalSummary).toHaveBeenCalledWith('Résumé brouillon suffisamment long pour demander une correction.', expect.objectContaining({ onRequestStart: expect.any(Function) }))
    expect(runWithAiQuota).toHaveBeenCalledWith(database, userId, 'resume_summary', expect.any(Function))
    expect(database.query).toHaveBeenCalledOnce()
    expect(res.json).toHaveBeenCalledWith({ suggestion })
  })
})
