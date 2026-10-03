import { describe, expect, it, vi } from 'vitest'
import { createResponse } from './helpers.js'

vi.mock('../src/services/offerUrlService.js', () => ({ importOfferFromUrl: vi.fn() }))
import { importOfferFromUrl } from '../src/services/offerUrlService.js'
import { importOfferUrl } from '../src/controllers/offerUrlController.js'

describe('offerUrlController', () => {
  it('rejects an empty or overlong URL before the importer is called', async () => {
    const next = vi.fn()
    await importOfferUrl({ body: { url: ' ' } }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 400 })
    expect(importOfferFromUrl).not.toHaveBeenCalled()
  })

  it('returns extracted offer fields for an accepted URL', async () => {
    const offer = { companyName: 'Example', jobTitle: 'Analyst', description: 'Description'.repeat(10), warnings: [] }
    importOfferFromUrl.mockResolvedValue(offer)
    const res = createResponse()
    await importOfferUrl({ body: { url: ' https://jobs.example/role ' } }, res, vi.fn())
    expect(importOfferFromUrl).toHaveBeenCalledWith('https://jobs.example/role')
    expect(res.json).toHaveBeenCalledWith({ offer })
  })
})
