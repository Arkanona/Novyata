import { afterEach, describe, expect, it, vi } from 'vitest'
import { createResumeShareLink, getResumeShareLinks, getSharedResume, revokeResumeShareLink } from './resumeShareService'

afterEach(() => { localStorage.clear(); vi.unstubAllGlobals() })

describe('resumeShareService', () => {
  it('uses private authenticated endpoints for create/list/revoke and a public endpoint for reading', async () => {
    localStorage.setItem('novyata_auth_token', 'secret-user-jwt')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    await getResumeShareLinks('resume-id')
    await createResumeShareLink('resume-id', { expiresInDays: 30, includeContactDetails: false })
    await revokeResumeShareLink('resume-id', 'link-id')
    await getSharedResume('opaque-token')
    expect(fetchMock.mock.calls.map(([url, options]) => [url, options.method || 'GET'])).toEqual([
      ['http://localhost:3001/api/v1/resumes/resume-id/share-links', 'GET'],
      ['http://localhost:3001/api/v1/resumes/resume-id/share-links', 'POST'],
      ['http://localhost:3001/api/v1/resumes/resume-id/share-links/link-id', 'DELETE'],
      ['http://localhost:3001/api/v1/shared-resumes/opaque-token', 'GET'],
    ])
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer secret-user-jwt')
    expect(fetchMock.mock.calls[3][1].headers).toEqual({})
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ expiresInDays: 30, includeContactDetails: false })
  })
})
