import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createResume, getResume, getResumes } from './resumeService'

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
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer jwt-token')
    expect(fetchMock.mock.calls[1][0]).toContain('/api/v1/resumes/resume-id')
    expect(fetchMock.mock.calls[2][1].method).toBe('POST')
  })
})
