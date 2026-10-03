import { EventEmitter } from 'node:events'
import { describe, expect, it, vi } from 'vitest'
import ApiError from '../src/utils/ApiError.js'
import { extractOfferFields, importOfferFromUrl, validateOfferUrl } from '../src/services/offerUrlService.js'

const html = `<html><head><title>Data Analyst — Example</title><script type="application/ld+json">{"@type":"JobPosting","title":"Data Analyst","hiringOrganization":{"name":"Example"},"jobLocation":{"address":{"addressLocality":"Lyon"}},"employmentType":"FULL_TIME","description":"<p>Nous recrutons un Data Analyst pour analyser les données avec SQL et Power BI. Travail en équipe produit.</p>","baseSalary":{"value":{"value":42000}}}</script></head><body><nav>Menu secret</nav><main><h1>Data Analyst</h1><p>Nous recrutons un Data Analyst pour analyser les données avec SQL et Power BI. Travail en équipe produit.</p></main></body></html>`

function mockRequest(responses) {
  const calls = []
  const requestImpl = (url, options) => {
    calls.push({ url, options })
    const req = new EventEmitter()
    req.end = () => {
      const responseData = responses.shift()
      const response = new EventEmitter()
      response.statusCode = responseData.status
      response.headers = responseData.headers || { 'content-type': 'text/html; charset=utf-8' }
      queueMicrotask(() => {
        req.emit('response', response)
        if (responseData.body) response.emit('data', Buffer.from(responseData.body))
        response.emit('end')
      })
    }
    req.destroy = vi.fn()
    return req
  }
  return { requestImpl, calls }
}

describe('offerUrlService', () => {
  it.each(['file:///etc/passwd', 'http://localhost/admin', 'http://127.0.0.1/', 'http://192.168.1.4/', 'http://user:secret@example.com', 'https://example.com:8443/job'])('rejects unsafe URL %s', (url) => {
    expect(() => validateOfferUrl(url)).toThrow(ApiError)
  })

  it('blocks DNS results that include a private address', async () => {
    const request = mockRequest([])
    await expect(importOfferFromUrl('https://jobs.example/role', { resolver: vi.fn().mockResolvedValue([{ address: '93.184.216.34', family: 4 }, { address: '10.0.0.4', family: 4 }]), requestImpl: request.requestImpl })).rejects.toMatchObject({ statusCode: 400 })
    expect(request.calls).toHaveLength(0)
  })

  it('extracts only fields explicitly available in a public job posting', () => {
    expect(extractOfferFields(html)).toMatchObject({ companyName: 'Example', jobTitle: 'Data Analyst', location: 'Lyon', contractType: 'FULL_TIME', salary: '42000' })
    expect(extractOfferFields(html).description).toContain('SQL et Power BI')
    expect(extractOfferFields(html).remote).toBe('')
  })

  it('fetches a bounded public page and pins its validated DNS address', async () => {
    const request = mockRequest([{ status: 200, body: html }])
    const offer = await importOfferFromUrl('https://jobs.example/role', { resolver: vi.fn().mockResolvedValue([{ address: '93.184.216.34', family: 4 }]), requestImpl: request.requestImpl })
    expect(offer).toMatchObject({ companyName: 'Example', jobTitle: 'Data Analyst', sourceUrl: 'https://jobs.example/role' })
    const resolved = await new Promise((resolve, reject) => request.calls[0].options.lookup('jobs.example', {}, (error, address, family) => error ? reject(error) : resolve({ address, family })))
    expect(resolved).toEqual({ address: '93.184.216.34', family: 4 })
  })

  it('revalidates redirect targets and rejects a redirect into a private network', async () => {
    const request = mockRequest([{ status: 302, headers: { location: 'http://127.0.0.1/admin' } }])
    await expect(importOfferFromUrl('https://jobs.example/role', { resolver: vi.fn().mockResolvedValue([{ address: '93.184.216.34', family: 4 }]), requestImpl: request.requestImpl })).rejects.toMatchObject({ statusCode: 400 })
    expect(request.calls).toHaveLength(1)
  })

  it('provides a manual fallback when the page has no usable offer description', async () => {
    const request = mockRequest([{ status: 200, body: '<html><head><title>Welcome</title></head><body>Welcome to our site.</body></html>' }])
    await expect(importOfferFromUrl('https://jobs.example/', { resolver: vi.fn().mockResolvedValue([{ address: '93.184.216.34', family: 4 }]), requestImpl: request.requestImpl })).rejects.toMatchObject({ statusCode: 422, message: expect.stringContaining('coller manuellement') })
  })
})
