import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import aiRequestGuard from '../src/middleware/aiRequestGuard.js'
import { createAiRateLimit } from '../src/middleware/aiRateLimit.js'

describe('AI request protections', () => {
  it('applies the configurable stricter AI rate limit', async () => {
    const app = express()
    app.use(express.json())
    app.use('/ai', createAiRateLimit({ windowMs: 60_000, max: 1 }))
    app.post('/ai', (_req, res) => res.json({ ok: true }))
    await request(app).post('/ai').send({}).expect(200)
    const limited = await request(app).post('/ai').send({})
    expect(limited.status).toBe(429)
    expect(limited.body.error.message).toContain('demandes IA')
  })

  it('rejects a duplicate in-flight request, then releases its fingerprint after completion', async () => {
    const app = express()
    app.use(express.json())
    app.use((req, _res, next) => { req.auth = { sub: 'user-1' }; next() })
    let finishFirst
    let firstRouteEntered
    const entered = new Promise((resolve) => { firstRouteEntered = resolve })
    app.post('/ai', aiRequestGuard, (req, res) => {
      if (req.body.request === 'same' && !finishFirst) {
        firstRouteEntered()
        finishFirst = () => res.status(200).json({ ok: true })
        return
      }
      return res.status(200).json({ ok: true })
    })

    const firstRequest = request(app).post('/ai').send({ request: 'same' }).then((response) => response)
    await entered
    const duplicate = await request(app).post('/ai').send({ request: 'same' })
    expect(duplicate.status).toBe(409)
    expect(duplicate.body.error.message).toContain('déjà en cours')
    finishFirst()
    expect((await firstRequest).status).toBe(200)
    await request(app).post('/ai').send({ request: 'same' }).expect(200)
  })
})
