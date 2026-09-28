import request from 'supertest'
import { describe, expect, it } from 'vitest'
import app from '../src/app.js'

describe('API routes', () => {
  it('exposes a health endpoint', async () => {
    const response = await request(app).get('/api/health')
    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ status: 'ok', service: 'novyata-api' })
    expect(response.body).toHaveProperty('databaseConfigured')
    expect(response.body).toHaveProperty('jwtConfigured')
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

  it('accepts Vite development origins on ports 5173 and 5174', async () => {
    const response = await request(app)
      .options('/api/v1/auth/register')
      .set('Origin', 'http://localhost:5174')
      .set('Access-Control-Request-Method', 'POST')
    expect(response.status).toBe(204)
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5174')
  })

  it('rejects origins that are not explicitly allowed', async () => {
    const response = await request(app)
      .get('/api/health')
      .set('Origin', 'https://untrusted.example')
    expect(response.status).toBe(500)
    expect(response.body.error.message).toBe('Une erreur interne est survenue.')
  })

  it('returns structured 404 errors', async () => {
    const response = await request(app).get('/api/unknown')
    expect(response.status).toBe(404)
    expect(response.body.error.message).toBe('Route introuvable.')
  })
})
