import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createResponse } from './helpers.js'

vi.mock('../src/config/database.js', () => ({ requireDatabase: vi.fn() }))

import { requireDatabase } from '../src/config/database.js'
import { createEducation, createExperience, deleteEducation, deleteExperience, updateEducation, updateExperience } from '../src/controllers/resumeSectionController.js'

const userId = '8b74e3e1-64b4-46f1-bfd8-c50a174cf908'
const resumeId = 'f8c5d2f2-6ff2-43d2-9e4f-5443200f6d4b'
const experienceId = '1e2c3d4e-6ff2-43d2-9e4f-5443200f6d4b'
const educationId = '2e2c3d4e-6ff2-43d2-9e4f-5443200f6d4b'
const experience = { id_experience: experienceId, id_resume: resumeId, job_title: 'Designer', company: 'Novyata', city: 'Paris', start_date: '2025-01-01', end_date: null, is_current: true, description: null }
const education = { id_education: educationId, id_resume: resumeId, degree: 'Master', school: 'Université', city: 'Paris', start_date: '2020-01-01', end_date: '2022-01-01', description: null }

describe('resumeSectionController', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates an experience for an owned resume', async () => {
    const database = { query: vi.fn().mockResolvedValue({ rows: [experience] }) }
    requireDatabase.mockReturnValue(database)
    const res = createResponse()
    await createExperience({ auth: { sub: userId }, params: { id: resumeId }, body: experience }, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json.mock.calls[0][0].experience.job_title).toBe('Designer')
  })

  it('updates and deletes an experience only through its owned resume', async () => {
    const database = { query: vi.fn().mockResolvedValueOnce({ rows: [{ ...experience, company: 'Novyata Studio' }] }).mockResolvedValueOnce({ rows: [{ id_experience: experienceId }] }) }
    requireDatabase.mockReturnValue(database)
    await updateExperience({ auth: { sub: userId }, params: { id: resumeId, experienceId }, body: { ...experience, company: 'Novyata Studio' } }, createResponse(), vi.fn())
    const res = createResponse()
    await deleteExperience({ auth: { sub: userId }, params: { id: resumeId, experienceId } }, res, vi.fn())
    expect(database.query.mock.calls[0][1]).toContain(userId)
    expect(res.status).toHaveBeenCalledWith(204)
  })

  it('creates an education for an owned resume', async () => {
    requireDatabase.mockReturnValue({ query: vi.fn().mockResolvedValue({ rows: [education] }) })
    const res = createResponse()
    await createEducation({ auth: { sub: userId }, params: { id: resumeId }, body: education }, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json.mock.calls[0][0].education.degree).toBe('Master')
  })

  it('updates and deletes an education only through its owned resume', async () => {
    const database = { query: vi.fn().mockResolvedValueOnce({ rows: [{ ...education, school: 'École Novyata' }] }).mockResolvedValueOnce({ rows: [{ id_education: educationId }] }) }
    requireDatabase.mockReturnValue(database)
    await updateEducation({ auth: { sub: userId }, params: { id: resumeId, educationId }, body: { ...education, school: 'École Novyata' } }, createResponse(), vi.fn())
    const res = createResponse()
    await deleteEducation({ auth: { sub: userId }, params: { id: resumeId, educationId } }, res, vi.fn())
    expect(database.query.mock.calls[0][1]).toContain(userId)
    expect(res.status).toHaveBeenCalledWith(204)
  })

  it('refuses access to a section belonging to another user', async () => {
    requireDatabase.mockReturnValue({ query: vi.fn().mockResolvedValue({ rows: [] }) })
    const next = vi.fn()
    await updateExperience({ auth: { sub: userId }, params: { id: resumeId, experienceId }, body: experience }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 404 })
  })

  it('reports a missing education resource', async () => {
    requireDatabase.mockReturnValue({ query: vi.fn().mockResolvedValue({ rows: [] }) })
    const next = vi.fn()
    await deleteEducation({ auth: { sub: userId }, params: { id: resumeId, educationId } }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 404 })
  })
})
