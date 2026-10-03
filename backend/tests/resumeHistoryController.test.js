import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createResponse } from './helpers.js'

vi.mock('../src/config/database.js', () => ({ requireDatabase: vi.fn() }))
import { requireDatabase } from '../src/config/database.js'
import { compareResumeSnapshots, compareResumes, duplicateResumeVersion, listResumeVersions, restoreResumeVersion } from '../src/controllers/resumeHistoryController.js'

const user = '8b74e3e1-64b4-46f1-bfd8-c50a174cf908'
const resumeId = '7b74e3e1-64b4-46f1-bfd8-c50a174cf908'
const versionId = '1b74e3e1-64b4-46f1-bfd8-c50a174cf908'
const snapshot = { resume: { title_resume: 'CV data', job_title: 'Data analyst', summary: 'Profil', template_key: 'modern', accent_color: '#314A67', font_size: 'large', font_family: 'Inter', content_density: 'normal', section_spacing: 'normal', heading_style: 'line', divider_style: 'solid', section_order: ['summary', 'experiences'] }, experiences: [{ job_title: 'Analyste', company: 'Studio', city: 'Lyon', start_date: '2025-01-01', end_date: null, is_current: true, description: 'Analyses SQL' }], educations: [{ degree: 'Master', school: 'Université', city: 'Lyon', start_date: '2022-01-01', end_date: null, description: '' }], skills: [{ name: 'SQL', level: 'Avancé' }], languages: [{ name: 'Français', level: 'Courant' }], custom_sections: [{ section_type: 'projects', title: 'Projet', content: 'Dashboard', display_order: 0 }] }

describe('resumeHistoryController', () => {
  beforeEach(() => vi.clearAllMocks())

  it('captures the current state on first history read and returns versions newest-first', async () => {
    const query = vi.fn().mockResolvedValueOnce({ rows: [{ id_resume: resumeId, plan: 'pro' }] }).mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ id_resume_version: versionId, snapshot, reason: 'État actuel' }] })
    requireDatabase.mockReturnValue({ query })
    const res = createResponse()
    await listResumeVersions({ params: { id: resumeId }, auth: { sub: user } }, res, vi.fn())
    expect(query.mock.calls[1][0]).toContain('capture_resume_version')
    expect(query.mock.calls[2][0]).toContain('order by created_at desc')
    expect(res.json).toHaveBeenCalledWith({ versions: [{ id_resume_version: versionId, snapshot, reason: 'État actuel' }] })
  })

  it('enforces ownership and the Pro capability for history', async () => {
    requireDatabase.mockReturnValue({ query: vi.fn().mockResolvedValueOnce({ rows: [] }) })
    const missing = vi.fn()
    await listResumeVersions({ params: { id: resumeId }, auth: { sub: user } }, createResponse(), missing)
    expect(missing.mock.calls[0][0]).toMatchObject({ statusCode: 404 })
    requireDatabase.mockReturnValue({ query: vi.fn().mockResolvedValueOnce({ rows: [{ id_resume: resumeId, plan: 'free' }] }) })
    const free = vi.fn()
    await listResumeVersions({ params: { id: resumeId }, auth: { sub: user } }, createResponse(), free)
    expect(free.mock.calls[0][0]).toMatchObject({ statusCode: 403 })
  })

  it('restores a historical snapshot as a new copy with children and visual preferences', async () => {
    const source = { id_resume: resumeId, parent_resume_id: null, title_resume: 'CV data', plan: 'pro' }
    const newId = '2b74e3e1-64b4-46f1-bfd8-c50a174cf908'
    const databaseQuery = vi.fn().mockResolvedValueOnce({ rows: [source] }).mockResolvedValueOnce({ rows: [{ id_resume_version: versionId, snapshot }] })
    const clientQuery = vi.fn(async (sql) => sql.includes('insert into resumes') ? { rows: [{ id_resume: newId, title_resume: 'CV data — Restauré', template_key: 'modern', accent_color: '#314A67', font_size: 'large' }] } : { rows: [] })
    const client = { query: clientQuery, release: vi.fn() }
    requireDatabase.mockReturnValue({ query: databaseQuery, connect: vi.fn().mockResolvedValue(client) })
    const res = createResponse(); const next = vi.fn()
    await restoreResumeVersion({ params: { id: resumeId, versionId }, auth: { sub: user }, body: {} }, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(clientQuery).toHaveBeenCalledWith(expect.stringContaining('set_config'))
    expect(clientQuery).toHaveBeenCalledWith(expect.stringContaining('insert into experiences'), [newId, 'Analyste', 'Studio', 'Lyon', '2025-01-01', null, true, 'Analyses SQL'])
    expect(clientQuery).toHaveBeenCalledWith(expect.stringContaining('capture_resume_version'), [newId, user, expect.stringContaining('Restauration')])
    expect(clientQuery).toHaveBeenCalledWith('commit')
    expect(databaseQuery.mock.calls.every(([sql]) => !sql.toLowerCase().includes('update resumes'))).toBe(true)
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json.mock.calls[0][0].resume).toMatchObject({ id_resume: newId, template_key: 'modern', font_size: 'large' })
    expect(client.release).toHaveBeenCalledOnce()
  })

  it('refuses a version that does not belong to the requested CV/user', async () => {
    const query = vi.fn().mockResolvedValueOnce({ rows: [{ id_resume: resumeId, plan: 'pro' }] }).mockResolvedValueOnce({ rows: [] })
    requireDatabase.mockReturnValue({ query })
    const next = vi.fn()
    await duplicateResumeVersion({ params: { id: resumeId, versionId }, auth: { sub: user }, body: {} }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 404 })
  })

  it('compares content and appearance deterministically', () => {
    const diff = compareResumeSnapshots(snapshot, { ...snapshot, resume: { ...snapshot.resume, summary: 'Nouveau profil', section_order: ['experiences', 'summary'], template_key: 'classic' }, skills: [{ name: 'Python', level: 'Débutant' }] })
    expect(diff.summary).toEqual({ before: 'Profil', after: 'Nouveau profil' })
    expect(diff.sectionOrder).toEqual({ before: ['summary', 'experiences'], after: ['experiences', 'summary'] })
    expect(diff.skills).toEqual({ added: [{ name: 'Python', level: 'Débutant' }], removed: [{ name: 'SQL', level: 'Avancé' }], modified: [] })
    expect(diff.appearance.template_key).toEqual({ before: 'modern', after: 'classic' })
    expect(compareResumeSnapshots(snapshot, JSON.parse(JSON.stringify(snapshot))).summary).toBeNull()
  })

  it('compares only two distinct CVs owned by a Pro user', async () => {
    const resultRows = [{ id_resume: resumeId, title_resume: 'Original', job_title: 'Analyste', snapshot }, { id_resume: versionId, title_resume: 'Adapté', job_title: 'Analyste', snapshot: { ...snapshot, resume: { ...snapshot.resume, summary: 'Autre profil' } } }]
    const query = vi.fn().mockResolvedValueOnce({ rows: resultRows })
    requireDatabase.mockReturnValue({ query })
    const res = createResponse()
    await compareResumes({ body: { leftResumeId: resumeId, rightResumeId: versionId }, auth: { sub: user } }, res, vi.fn())
    expect(query.mock.calls[0][1]).toEqual([[resumeId, versionId], user, 'pro'])
    expect(res.json.mock.calls[0][0].diff.summary).toEqual({ before: 'Profil', after: 'Autre profil' })
  })
})
