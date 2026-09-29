import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createResponse } from './helpers.js'

vi.mock('../src/config/database.js', () => ({ requireDatabase: vi.fn() }))

import { requireDatabase } from '../src/config/database.js'
import { createApplication, deleteApplication, getApplication, listApplications, updateApplication } from '../src/controllers/applicationController.js'

const userId = '8b74e3e1-64b4-46f1-bfd8-c50a174cf908'
const otherUserId = '3f6070dc-e2c2-48e0-9089-a07155fbec2f'
const applicationId = '1a8dc2f2-6ff2-43d2-9e4f-5443200f6d4b'
const resumeId = 'f8c5d2f2-6ff2-43d2-9e4f-5443200f6d4b'
const letterId = 'fa8dc2f2-6ff2-43d2-9e4f-5443200f6d4b'
const application = { id_application: applicationId, id_resume: resumeId, id_cover_letter: letterId, company_name: 'Novyata', job_title: 'Product Designer', location: 'Paris', job_url: 'https://example.com/jobs/1', salary: '45 000 €', status: 'Candidature envoyée', application_date: '2026-09-29', contact_name: 'Marie Martin', contact_email: 'marie@example.com', notes: 'Relancer dans une semaine.', created_at: '2026-09-29', updated_at: '2026-09-29' }
const payload = { company_name: ' Novyata ', job_title: ' Product Designer ', location: ' Paris ', job_url: 'https://example.com/jobs/1', salary: '45 000 €', status: 'Candidature envoyée', application_date: '2026-09-29', contact_name: ' Marie Martin ', contact_email: ' MARIE@EXAMPLE.COM ', notes: ' Relancer dans une semaine. ', id_resume: resumeId, id_cover_letter: letterId }

describe('applicationController', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates an application linked to owned resources', async () => {
    const database = { query: vi.fn().mockResolvedValueOnce({ rows: [{ id_resume: resumeId }] }).mockResolvedValueOnce({ rows: [{ id_cover_letter: letterId }] }).mockResolvedValueOnce({ rows: [application] }) }
    requireDatabase.mockReturnValue(database)
    const res = createResponse()
    await createApplication({ auth: { sub: userId }, body: payload }, res, vi.fn())
    expect(database.query.mock.calls[0][1]).toEqual([resumeId, userId])
    expect(database.query.mock.calls[1][1]).toEqual([letterId, userId])
    expect(database.query.mock.calls[2][1]).toContain(userId)
    expect(res.status).toHaveBeenCalledWith(201)
  })

  it('rejects invalid application data before accessing the database', async () => {
    const next = vi.fn()
    await createApplication({ auth: { sub: userId }, body: { company_name: '', job_title: '', job_url: 'not-a-url' } }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 400 })
    expect(requireDatabase).not.toHaveBeenCalled()
  })

  it('lists only the authenticated user applications', async () => {
    const database = { query: vi.fn().mockResolvedValue({ rows: [application] }) }
    requireDatabase.mockReturnValue(database)
    const res = createResponse()
    await listApplications({ auth: { sub: userId } }, res, vi.fn())
    expect(database.query.mock.calls[0][1]).toEqual([userId])
    expect(res.json.mock.calls[0][0].applications).toHaveLength(1)
  })

  it('retrieves an owned application', async () => {
    const database = { query: vi.fn().mockResolvedValue({ rows: [{ ...application, application_date: new Date('2026-09-29T00:00:00.000Z') }] }) }
    requireDatabase.mockReturnValue(database)
    const res = createResponse()
    await getApplication({ auth: { sub: userId }, params: { id: applicationId } }, res, vi.fn())
    expect(database.query.mock.calls[0][1]).toEqual([applicationId, userId])
    expect(res.json.mock.calls[0][0].application.company_name).toBe('Novyata')
    expect(res.json.mock.calls[0][0].application.application_date).toBe('2026-09-29')
  })

  it('does not expose another user application', async () => {
    requireDatabase.mockReturnValue({ query: vi.fn().mockResolvedValue({ rows: [] }) })
    const next = vi.fn()
    await getApplication({ auth: { sub: otherUserId }, params: { id: applicationId } }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 404, message: 'Candidature introuvable.' })
  })

  it('updates an application and changes its status', async () => {
    const updated = { ...application, id_resume: null, id_cover_letter: null, status: 'Entretien' }
    const database = { query: vi.fn().mockResolvedValue({ rows: [updated] }) }
    requireDatabase.mockReturnValue(database)
    const res = createResponse()
    await updateApplication({ auth: { sub: userId }, params: { id: applicationId }, body: { ...payload, id_resume: null, id_cover_letter: null, status: 'Entretien' } }, res, vi.fn())
    expect(database.query.mock.calls[0][1]).toContain('Entretien')
    expect(res.json.mock.calls[0][0].application.status).toBe('Entretien')
  })

  it('returns 404 when an application to update does not exist', async () => {
    requireDatabase.mockReturnValue({ query: vi.fn().mockResolvedValue({ rows: [] }) })
    const next = vi.fn()
    await updateApplication({ auth: { sub: userId }, params: { id: applicationId }, body: { ...payload, id_resume: null, id_cover_letter: null } }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 404, message: 'Candidature introuvable.' })
  })

  it('deletes an owned application', async () => {
    const database = { query: vi.fn().mockResolvedValue({ rows: [{ id_application: applicationId }] }) }
    requireDatabase.mockReturnValue(database)
    const res = createResponse()
    await deleteApplication({ auth: { sub: userId }, params: { id: applicationId } }, res, vi.fn())
    expect(database.query.mock.calls[0][1]).toEqual([applicationId, userId])
    expect(res.status).toHaveBeenCalledWith(204)
  })

  it('returns 404 when deleting a missing or forbidden application', async () => {
    requireDatabase.mockReturnValue({ query: vi.fn().mockResolvedValue({ rows: [] }) })
    const next = vi.fn()
    await deleteApplication({ auth: { sub: otherUserId }, params: { id: applicationId } }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 404, message: 'Candidature introuvable.' })
  })
})
