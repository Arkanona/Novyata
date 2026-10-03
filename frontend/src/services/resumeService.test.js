import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { compareResumes, createResume, createResumeFromImport, deleteResume, duplicateResumeVersion, generateResumeSummary, getResume, getResumeVersions, getResumes, improveResumeExperience, improveResumeSummary, parseResumeFile, restoreResumeVersion, updateResume } from './resumeService'

describe('resumeService', () => {
  beforeEach(() => localStorage.setItem('novyata_auth_token', 'jwt-token'))
  afterEach(() => {
    localStorage.clear()
    vi.unstubAllGlobals()
  })

  it('uses the token for all protected resume calls', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ resumes: [] }) })
    vi.stubGlobal('fetch', fetchMock)
    await getResumes()
    await getResume('resume-id')
    await createResume({ title_resume: 'CV', first_name: 'Marie', last_name: 'Laurent', job_title: 'Designer' })
    await updateResume('resume-id', { first_name: 'Marie' })
    await deleteResume('resume-id')
    expect(fetchMock).toHaveBeenCalledTimes(5)
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer jwt-token')
    expect(fetchMock.mock.calls[1][0]).toContain('/api/v1/resumes/resume-id')
    expect(fetchMock.mock.calls[2][1].method).toBe('POST')
    expect(fetchMock.mock.calls[3][1].method).toBe('PATCH')
    expect(fetchMock.mock.calls[4][1].method).toBe('DELETE')
  })

  it('uploads a CV as multipart without overriding the browser boundary and confirms import as JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ import: { first_name: 'Marie' }, resume: { id_resume: 'resume-1' } }) })
    vi.stubGlobal('fetch', fetchMock)
    const file = new File(['%PDF-1.7'], 'cv.pdf', { type: 'application/pdf' })
    await parseResumeFile(file)
    await createResumeFromImport({ title_resume: 'CV Marie' })

    const [uploadUrl, uploadOptions] = fetchMock.mock.calls[0]
    expect(uploadUrl).toContain('/api/v1/resumes/import/parse')
    expect(uploadOptions.headers.Authorization).toBe('Bearer jwt-token')
    expect(uploadOptions.headers).not.toHaveProperty('Content-Type')
    expect(uploadOptions.body).toBeInstanceOf(FormData)
    expect(uploadOptions.body.get('file')).toBe(file)
    expect(fetchMock.mock.calls[1][1].headers['Content-Type']).toBe('application/json')
    expect(fetchMock.mock.calls[1][0]).toContain('/api/v1/resumes/import')
  })

  it('uses protected endpoints for version history, restore, duplicate and deterministic comparison', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ versions: [] }) })
    vi.stubGlobal('fetch', fetchMock)
    await getResumeVersions('resume-id')
    await restoreResumeVersion('resume-id', 'version-id')
    await duplicateResumeVersion('resume-id', 'version-id', 'CV copie')
    await compareResumes('resume-id', 'resume-two')
    expect(fetchMock.mock.calls.map(([url, options]) => [url, options?.method || 'GET'])).toEqual([
      ['http://localhost:3001/api/v1/resumes/resume-id/versions', 'GET'],
      ['http://localhost:3001/api/v1/resumes/resume-id/versions/version-id/restore', 'POST'],
      ['http://localhost:3001/api/v1/resumes/resume-id/versions/version-id/duplicate', 'POST'],
      ['http://localhost:3001/api/v1/resumes/compare', 'POST'],
    ])
    expect(fetchMock.mock.calls.every(([, options]) => options.headers.Authorization === 'Bearer jwt-token')).toBe(true)
    expect(JSON.parse(fetchMock.mock.calls[3][1].body)).toEqual({ leftResumeId: 'resume-id', rightResumeId: 'resume-two' })
  })

  it('uses the dedicated protected endpoint to request an editable summary proposal', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ suggestion: 'Résumé proposé.' }) })
    vi.stubGlobal('fetch', fetchMock)
    await generateResumeSummary('resume-id')
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:3001/api/v1/resume-tools/resume-id/summary')
    expect(fetchMock.mock.calls[0][1].method).toBe('POST')
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer jwt-token')
  })

  it('uses the dedicated protected endpoint to request an editable experience proposal', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ suggestion: 'Description proposée.' }) })
    vi.stubGlobal('fetch', fetchMock)
    await improveResumeExperience('resume-id', 'experience-id')
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:3001/api/v1/resume-tools/resume-id/experiences/experience-id/improve')
    expect(fetchMock.mock.calls[0][1].method).toBe('POST')
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer jwt-token')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({})
  })

  it('sends the current summary as a draft for review without saving it', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ suggestion: 'Résumé proposé.' }) })
    vi.stubGlobal('fetch', fetchMock)
    await improveResumeSummary('resume-id', 'Texte initial à corriger.')
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:3001/api/v1/resume-tools/resume-id/summary/improve')
    expect(fetchMock.mock.calls[0][1].method).toBe('POST')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ text: 'Texte initial à corriger.' })
  })
})
