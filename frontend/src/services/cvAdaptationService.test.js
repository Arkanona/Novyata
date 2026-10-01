import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { applyCvAdaptation, getCvAdaptationProposals } from './cvAdaptationService'

describe('cvAdaptationService', () => {
  beforeEach(() => localStorage.setItem('novyata_auth_token', 'jwt-token'))
  afterEach(() => { localStorage.clear(); vi.unstubAllGlobals() })

  it('uses the active authentication token for proposals and copy creation', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ adaptation: { proposals: [] } }) })
    vi.stubGlobal('fetch', fetchMock)

    await getCvAdaptationProposals('analysis-id')
    await applyCvAdaptation('analysis-id', { proposals: [], acceptedIds: [] })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer jwt-token')
    expect(fetchMock.mock.calls[1][0]).toContain('/api/v1/job-analyses/analysis-id/cv-adaptation/apply')
    expect(fetchMock.mock.calls[1][1].method).toBe('POST')
  })
})
