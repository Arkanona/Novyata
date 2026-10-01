import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createResponse } from './helpers.js'

vi.mock('../src/config/database.js', () => ({ requireDatabase: vi.fn() }))
vi.mock('../src/services/coverLetterGenerationService.js', () => ({ generateCoverLetter: vi.fn() }))
vi.mock('../src/services/aiUsageService.js', () => ({ assertAiQuota: vi.fn(), consumeAiQuota: vi.fn() }))

import { requireDatabase } from '../src/config/database.js'
import { generateCoverLetter } from '../src/services/coverLetterGenerationService.js'
import { createGeneratedCoverLetter } from '../src/controllers/coverLetterGenerationController.js'
import ApiError from '../src/utils/ApiError.js'

const userId = '8b74e3e1-64b4-46f1-bfd8-c50a174cf908'
const otherUserId = '3f6070dc-e2c2-48e0-9089-a07155fbec2f'
const resumeId = 'f8c5d2f2-6ff2-43d2-9e4f-5443200f6d4b'
const body = { resumeId, jobDescription: 'Nous recherchons un Product Designer maîtrisant Figma, la recherche utilisateur et les tests.', companyName: 'Novyata', jobTitle: 'Product Designer', analysis: { matchedSkills: ['Figma'], importantKeywords: ['Recherche utilisateur'], suggestions: ['Illustrez vos projets.'] } }
const validGeneration = { subject: 'Candidature au poste de Product Designer', content: 'Madame, Monsieur, je vous adresse ma candidature pour le poste de Product Designer.' }

describe('coverLetterGenerationController', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects an empty offer before database access', async () => {
    const next = vi.fn()
    await createGeneratedCoverLetter({ auth: { sub: userId }, body: { resumeId, jobDescription: '' } }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 400, details: { jobDescription: expect.any(String) } })
    expect(requireDatabase).not.toHaveBeenCalled()
  })

  it('returns 404 when the resume does not exist', async () => {
    requireDatabase.mockReturnValue({ query: vi.fn().mockResolvedValue({ rows: [] }) })
    const next = vi.fn()
    await createGeneratedCoverLetter({ auth: { sub: userId }, body }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 404, message: 'CV introuvable.' })
  })

  it('does not generate a letter from a resume owned by another user', async () => {
    const database = { query: vi.fn().mockResolvedValue({ rows: [] }) }
    requireDatabase.mockReturnValue(database)
    const next = vi.fn()
    await createGeneratedCoverLetter({ auth: { sub: otherUserId }, body }, createResponse(), next)
    expect(database.query.mock.calls[0][1]).toEqual([resumeId, otherUserId])
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 404 })
    expect(generateCoverLetter).not.toHaveBeenCalled()
  })

  it('returns an invalid AI response as a controlled error', async () => {
    const database = { query: vi.fn().mockResolvedValueOnce({ rows: [{ id_resume: resumeId, title_resume: 'CV' }] }).mockResolvedValue({ rows: [] }) }
    requireDatabase.mockReturnValue(database)
    generateCoverLetter.mockRejectedValue(new ApiError(502, 'Le service de génération a renvoyé une réponse invalide.'))
    const next = vi.fn()
    await createGeneratedCoverLetter({ auth: { sub: userId }, body }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 502 })
  })

  it('returns a generated draft without modifying the resume', async () => {
    const database = { query: vi.fn().mockResolvedValueOnce({ rows: [{ id_resume: resumeId, title_resume: 'CV', job_title: 'Designer' }] }).mockResolvedValue({ rows: [] }) }
    requireDatabase.mockReturnValue(database)
    generateCoverLetter.mockResolvedValue(validGeneration)
    const res = createResponse()
    await createGeneratedCoverLetter({ auth: { sub: userId }, body }, res, vi.fn())
    expect(generateCoverLetter).toHaveBeenCalledWith(expect.objectContaining({ jobDescription: body.jobDescription, companyName: 'Novyata', jobTitle: 'Product Designer', analysis: body.analysis, resume: expect.objectContaining({ id_resume: resumeId }) }))
    expect(res.json).toHaveBeenCalledWith({ generation: validGeneration })
    expect(database.query.mock.calls).toHaveLength(5)
    expect(database.query.mock.calls.every(([sql]) => !/insert|update|delete/i.test(sql))).toBe(true)
  })

  it('does not alter the AI draft or add facts before returning it', async () => {
    const database = { query: vi.fn().mockResolvedValueOnce({ rows: [{ id_resume: resumeId, title_resume: 'CV', skills: undefined }] }).mockResolvedValue({ rows: [] }) }
    requireDatabase.mockReturnValue(database)
    const draft = { subject: 'Candidature', content: 'Madame, Monsieur, voici un texte généré sans ajout automatique de données.' }
    generateCoverLetter.mockResolvedValue(draft)
    const res = createResponse()

    await createGeneratedCoverLetter({ auth: { sub: userId }, body }, res, vi.fn())

    expect(res.json).toHaveBeenCalledWith({ generation: draft })
  })
})
