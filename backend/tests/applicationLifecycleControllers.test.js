import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createResponse } from './helpers.js'

vi.mock('../src/config/database.js', () => ({ requireDatabase: vi.fn() }))
vi.mock('../src/services/aiUsageService.js', () => ({ assertAiQuota: vi.fn(), consumeAiQuota: vi.fn(), runWithAiQuota: vi.fn(async (_db, _user, _feature, work) => work({ plan: 'pro', onRequestStart: vi.fn() })) }))
vi.mock('../src/services/applicationFollowupService.js', () => ({ generateFollowup: vi.fn() }))

import { requireDatabase } from '../src/config/database.js'
import { runWithAiQuota } from '../src/services/aiUsageService.js'
import { generateFollowup } from '../src/services/applicationFollowupService.js'
import { createFollowup, createThankYou, markFollowupSent } from '../src/controllers/applicationFollowupController.js'
import { createInterview, updateInterview } from '../src/controllers/interviewController.js'

const user = '8b74e3e1-64b4-46f1-bfd8-c50a174cf908'
const application = '7b74e3e1-64b4-46f1-bfd8-c50a174cf908'
const interview = '6b74e3e1-64b4-46f1-bfd8-c50a174cf908'
const followup = '5b74e3e1-64b4-46f1-bfd8-c50a174cf908'
const ownedApplication = { id_application: application, company_name: 'Novyata', job_title: 'Product designer', status: 'Entretien', plan: 'pro' }

describe('application lifecycle controllers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    generateFollowup.mockResolvedValue({ content: 'Merci pour notre échange au sujet du poste de Product designer.' })
  })

  it('creates an interview report and writes the matching timeline event', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [{ id_application: application }] })
      .mockResolvedValueOnce({ rows: [{ id_interview: interview, interview_type: 'Visio', key_points: 'Portfolio' }] })
      .mockResolvedValueOnce({ rows: [] })
    requireDatabase.mockReturnValue({ query })
    const res = createResponse()
    await createInterview({ params: { id: application }, auth: { sub: user }, body: { interview_type: 'Visio', key_points: 'Portfolio' } }, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(201)
    expect(query.mock.calls[2][0]).toContain('application_events')
    expect(query.mock.calls[2][1]).toEqual(expect.arrayContaining([application, 'interview_completed']))
  })

  it('updates an owned interview report', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [{ id_application: application }] })
      .mockResolvedValueOnce({ rows: [{ id_interview: interview, feeling: 'Positif' }] })
    requireDatabase.mockReturnValue({ query })
    const res = createResponse()
    await updateInterview({ params: { id: application, interviewId: interview }, auth: { sub: user }, body: { feeling: 'Positif' } }, res, vi.fn())
    expect(query.mock.calls[1][0]).toContain('update interviews')
    expect(res.json).toHaveBeenCalledWith({ interview: expect.objectContaining({ feeling: 'Positif' }) })
  })

  it('rejects an interview report for another user application', async () => {
    requireDatabase.mockReturnValue({ query: vi.fn().mockResolvedValue({ rows: [] }) })
    const next = vi.fn()
    await createInterview({ params: { id: application }, auth: { sub: user }, body: {} }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 404 })
  })

  it('requires an interview report before generating a thank-you note', async () => {
    const query = vi.fn().mockResolvedValueOnce({ rows: [ownedApplication] }).mockResolvedValueOnce({ rows: [] })
    requireDatabase.mockReturnValue({ query })
    const next = vi.fn()
    await createThankYou({ params: { id: application }, auth: { sub: user } }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 400 })
    expect(generateFollowup).not.toHaveBeenCalled()
  })

  it('keeps advanced follow-up types unavailable to Free while allowing the basic first follow-up', async () => {
    const query = vi.fn().mockResolvedValueOnce({ rows: [{ ...ownedApplication, plan: 'free' }] })
    requireDatabase.mockReturnValue({ query })
    const next = vi.fn()
    await createFollowup({ params: { id: application }, auth: { sub: user }, body: { type: 'Deuxième relance' } }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 403, details: { upgrade: true, feature: 'advancedFollowups' } })
    expect(generateFollowup).not.toHaveBeenCalled()
    expect(query).toHaveBeenCalledTimes(1)
  })

  it('permits a Pro second follow-up and persists it as a user-reviewed draft', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [ownedApplication] })
      .mockResolvedValueOnce({ rows: [{ id_followup: followup, type: 'Deuxième relance', content: 'Merci de considérer ma candidature. Je reste disponible.' }] })
    requireDatabase.mockReturnValue({ query })
    const res = createResponse()
    await createFollowup({ params: { id: application }, auth: { sub: user }, body: { type: 'Deuxième relance' } }, res, vi.fn())
    expect(generateFollowup).toHaveBeenCalledWith(expect.objectContaining({ type: 'Deuxième relance', company: 'Novyata' }), expect.objectContaining({ onRequestStart: expect.any(Function) }))
    expect(res.status).toHaveBeenCalledWith(201)
  })

  it('keeps after-interview thank-you generation Pro-only', async () => {
    const query = vi.fn().mockResolvedValueOnce({ rows: [{ ...ownedApplication, plan: 'free' }] })
    requireDatabase.mockReturnValue({ query })
    const next = vi.fn()
    await createThankYou({ params: { id: application }, auth: { sub: user } }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 403, details: { feature: 'advancedFollowups' } })
    expect(generateFollowup).not.toHaveBeenCalled()
    expect(query).toHaveBeenCalledTimes(1)
  })

  it('generates and persists a thank-you draft using the report only', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [ownedApplication] })
      .mockResolvedValueOnce({ rows: [{ interview_type: 'Visio', key_points: 'Portfolio' }] })
      .mockResolvedValueOnce({ rows: [{ id_followup: followup, type: 'Remerciement', content: 'Merci pour notre échange.' }] })
    requireDatabase.mockReturnValue({ query })
    const res = createResponse()
    await createThankYou({ params: { id: application }, auth: { sub: user } }, res, vi.fn())
    expect(runWithAiQuota).toHaveBeenCalled()
    expect(generateFollowup).toHaveBeenCalledWith(expect.objectContaining({ kind: 'thank_you', company: 'Novyata', interview: { interview_type: 'Visio', key_points: 'Portfolio' } }), expect.objectContaining({ onRequestStart: expect.any(Function) }))
    expect(res.status).toHaveBeenCalledWith(201)
  })

  it('marks an owned follow-up as sent and adds the timeline event', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [ownedApplication] })
      .mockResolvedValueOnce({ rows: [{ id_followup: followup, type: 'Remerciement', content: 'Merci', sent_at: '2026-01-01' }] })
      .mockResolvedValueOnce({ rows: [] })
    requireDatabase.mockReturnValue({ query })
    const res = createResponse()
    await markFollowupSent({ params: { id: application, followupId: followup }, auth: { sub: user } }, res, vi.fn())
    expect(query.mock.calls[2][0]).toContain('application_events')
    expect(query.mock.calls[2][1]).toEqual(expect.arrayContaining([application, 'followup_sent']))
    expect(res.json).toHaveBeenCalledWith({ followup: expect.objectContaining({ id_followup: followup }) })
  })
})
