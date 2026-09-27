import request from 'supertest'
import { describe, expect, it } from 'vitest'
import app from '../src/app.js'

describe('API routes', () => {
  it('exposes a health endpoint', async () => {
    const response = await request(app).get('/api/health')
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ status: 'ok', service: 'novyata-api' })
  })

  it('protects resume endpoints before any database access', async () => {
    const response = await request(app).get('/api/v1/resumes')
    expect(response.status).toBe(401)
    expect(response.body.error.message).toBe('Authentification requise.')
  })

  it('keeps the applications placeholder contract stable', async () => {
    const response = await request(app).get('/api/applications')
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ applications: [] })
  })

  it('returns structured 404 errors', async () => {
    const response = await request(app).get('/api/unknown')
    expect(response.status).toBe(404)
    expect(response.body.error.message).toBe('Route introuvable.')
  })
})
