import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createResponse } from './helpers.js'

vi.mock('../src/config/database.js', () => ({ requireDatabase: vi.fn() }))

import { requireDatabase } from '../src/config/database.js'
import { createSavedAnswer, deleteSavedAnswer, listSavedAnswers, updateSavedAnswer } from '../src/controllers/savedAnswerController.js'

const user = '8b74e3e1-64b4-46f1-bfd8-c50a174cf908'
const answerId = '7b74e3e1-64b4-46f1-bfd8-c50a174cf908'
const payload = { category: 'Présentez-vous', title: 'Mon parcours', content: 'Je suis designer produit avec une expérience confirmée.' }

describe('savedAnswerController', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates and lists only the authenticated user’s interview answers', async () => {
    const query = vi.fn().mockResolvedValueOnce({ rows: [{ id_saved_answer: answerId, ...payload }] }).mockResolvedValueOnce({ rows: [{ id_saved_answer: answerId, ...payload }] })
    requireDatabase.mockReturnValue({ query })
    const createRes = createResponse()
    await createSavedAnswer({ auth: { sub: user }, body: payload }, createRes, vi.fn())
    expect(createRes.status).toHaveBeenCalledWith(201)
    expect(query.mock.calls[0][1]).toEqual([user, payload.category, payload.title, payload.content])
    const listRes = createResponse()
    await listSavedAnswers({ auth: { sub: user } }, listRes, vi.fn())
    expect(query.mock.calls[1][0]).toContain('where id_user=$1')
    expect(listRes.json).toHaveBeenCalledWith({ answers: [expect.objectContaining({ id_saved_answer: answerId })] })
  })

  it('updates only an owned answer and rejects an answer from another user', async () => {
    const query = vi.fn().mockResolvedValueOnce({ rows: [{ id_saved_answer: answerId, ...payload, title: 'Version revue' }] }).mockResolvedValueOnce({ rows: [] })
    requireDatabase.mockReturnValue({ query })
    const res = createResponse()
    await updateSavedAnswer({ params: { id: answerId }, auth: { sub: user }, body: { ...payload, title: 'Version revue' } }, res, vi.fn())
    expect(query.mock.calls[0][1]).toEqual(['Présentez-vous', 'Version revue', payload.content, answerId, user])
    const next = vi.fn()
    await updateSavedAnswer({ params: { id: answerId }, auth: { sub: user }, body: payload }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 404 })
  })

  it('deletes only an owned answer and validates the payload', async () => {
    requireDatabase.mockReturnValue({ query: vi.fn().mockResolvedValue({ rows: [{ id_saved_answer: answerId }] }) })
    const res = createResponse()
    await deleteSavedAnswer({ params: { id: answerId }, auth: { sub: user } }, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(204)
    const next = vi.fn()
    await createSavedAnswer({ auth: { sub: user }, body: { ...payload, content: '' } }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 400 })
  })
})
