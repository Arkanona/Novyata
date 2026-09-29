import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createResponse } from './helpers.js'

vi.mock('../src/config/database.js', () => ({ requireDatabase: vi.fn() }))

import { requireDatabase } from '../src/config/database.js'
import { createCoverLetter, deleteCoverLetter, getCoverLetter, listCoverLetters, updateCoverLetter } from '../src/controllers/coverLetterController.js'

const userId = '8b74e3e1-64b4-46f1-bfd8-c50a174cf908'
const otherUserId = '3f6070dc-e2c2-48e0-9089-a07155fbec2f'
const resumeId = 'f8c5d2f2-6ff2-43d2-9e4f-5443200f6d4b'
const letterId = 'fa8dc2f2-6ff2-43d2-9e4f-5443200f6d4b'
const letter = { id_cover_letter: letterId, id_resume: resumeId, title: 'Lettre Product Designer', company_name: 'Novyata', job_title: 'Product Designer', recipient_name: 'Madame Martin', recipient_position: 'Responsable RH', company_address: '10 rue de Paris', subject: 'Candidature Product Designer', content: 'Madame, Monsieur, je souhaite vous proposer ma candidature pour ce poste.', template: 'classic', created_at: '2026-01-01', updated_at: '2026-01-01' }
const payload = { title: ' Lettre Product Designer ', company_name: ' Novyata ', job_title: ' Product Designer ', recipient_name: ' Madame Martin ', recipient_position: ' Responsable RH ', company_address: ' 10 rue de Paris ', subject: ' Candidature Product Designer ', content: ' Madame, Monsieur, je souhaite vous proposer ma candidature pour ce poste. ', id_resume: resumeId, template: 'modern' }

describe('coverLetterController', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates a letter linked to an owned resume', async () => {
    const database = { query: vi.fn().mockResolvedValueOnce({ rows: [{ id_resume: resumeId }] }).mockResolvedValueOnce({ rows: [{ ...letter, template: 'modern' }] }) }
    requireDatabase.mockReturnValue(database)
    const res = createResponse()

    await createCoverLetter({ auth: { sub: userId }, body: payload }, res, vi.fn())

    expect(database.query.mock.calls[0][1]).toEqual([resumeId, userId])
    expect(database.query.mock.calls[1][1]).toEqual([userId, resumeId, 'Lettre Product Designer', 'Novyata', 'Product Designer', 'Madame Martin', 'Responsable RH', '10 rue de Paris', 'Candidature Product Designer', 'Madame, Monsieur, je souhaite vous proposer ma candidature pour ce poste.', 'modern'])
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json.mock.calls[0][0].cover_letter.template).toBe('modern')
  })

  it('rejects invalid letter data before querying the database', async () => {
    const next = vi.fn()
    await createCoverLetter({ auth: { sub: userId }, body: { title: '', content: 'trop court' } }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 400 })
    expect(requireDatabase).not.toHaveBeenCalled()
  })

  it('refuses a resume that does not belong to the authenticated user', async () => {
    requireDatabase.mockReturnValue({ query: vi.fn().mockResolvedValue({ rows: [] }) })
    const next = vi.fn()
    await createCoverLetter({ auth: { sub: otherUserId }, body: payload }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 404, message: 'CV introuvable.' })
  })

  it('lists only the letters of the authenticated user', async () => {
    const database = { query: vi.fn().mockResolvedValue({ rows: [letter] }) }
    requireDatabase.mockReturnValue(database)
    const res = createResponse()
    await listCoverLetters({ auth: { sub: userId } }, res, vi.fn())
    expect(database.query.mock.calls[0][1]).toEqual([userId])
    expect(res.json.mock.calls[0][0].cover_letters).toHaveLength(1)
  })

  it('retrieves an owned letter', async () => {
    const database = { query: vi.fn().mockResolvedValue({ rows: [letter] }) }
    requireDatabase.mockReturnValue(database)
    const res = createResponse()
    await getCoverLetter({ auth: { sub: userId }, params: { id: letterId } }, res, vi.fn())
    expect(database.query.mock.calls[0][1]).toEqual([letterId, userId])
    expect(res.json.mock.calls[0][0].cover_letter.title).toBe(letter.title)
  })

  it('does not reveal a letter owned by another user', async () => {
    requireDatabase.mockReturnValue({ query: vi.fn().mockResolvedValue({ rows: [] }) })
    const next = vi.fn()
    await getCoverLetter({ auth: { sub: otherUserId }, params: { id: letterId } }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 404, message: 'Lettre introuvable.' })
  })

  it('updates an owned letter', async () => {
    const database = { query: vi.fn().mockResolvedValue({ rows: [{ ...letter, title: 'Lettre actualisée', template: 'modern' }] }) }
    requireDatabase.mockReturnValue(database)
    const res = createResponse()
    await updateCoverLetter({ auth: { sub: userId }, params: { id: letterId }, body: { ...payload, id_resume: null, title: ' Lettre actualisée ' } }, res, vi.fn())
    expect(database.query.mock.calls[0][1]).toContain(userId)
    expect(res.json.mock.calls[0][0].cover_letter.title).toBe('Lettre actualisée')
  })

  it('returns 404 when the letter to update does not exist', async () => {
    requireDatabase.mockReturnValue({ query: vi.fn().mockResolvedValue({ rows: [] }) })
    const next = vi.fn()
    await updateCoverLetter({ auth: { sub: userId }, params: { id: letterId }, body: { ...payload, id_resume: null } }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 404, message: 'Lettre introuvable.' })
  })

  it('deletes only an owned letter', async () => {
    const database = { query: vi.fn().mockResolvedValue({ rows: [{ id_cover_letter: letterId }] }) }
    requireDatabase.mockReturnValue(database)
    const res = createResponse()
    await deleteCoverLetter({ auth: { sub: userId }, params: { id: letterId } }, res, vi.fn())
    expect(database.query.mock.calls[0][1]).toEqual([letterId, userId])
    expect(res.status).toHaveBeenCalledWith(204)
  })

  it('returns 404 when deleting a missing or forbidden letter', async () => {
    requireDatabase.mockReturnValue({ query: vi.fn().mockResolvedValue({ rows: [] }) })
    const next = vi.fn()
    await deleteCoverLetter({ auth: { sub: otherUserId }, params: { id: letterId } }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 404, message: 'Lettre introuvable.' })
  })
})
