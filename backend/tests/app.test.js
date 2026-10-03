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

  it('protects CV import parsing and creation before processing upload data', async () => {
    const parse = await request(app).post('/api/v1/resumes/import/parse')
    const create = await request(app).post('/api/v1/resumes/import').send({ title_resume: 'Mon CV' })
    expect(parse.status).toBe(401)
    expect(create.status).toBe(401)
    expect(parse.body.error.message).toBe('Authentification requise.')
    expect(create.body.error.message).toBe('Authentification requise.')
  })

  it('protects public offer URL import behind authentication', async () => {
    const response = await request(app).post('/api/v1/job-offer-import').send({ url: 'https://jobs.example/role' })
    expect(response.status).toBe(401)
  })

  it('protects multi-resume offer matching behind authentication', async () => {
    const response = await request(app).post('/api/v1/resume-matching').send({ jobDescription: 'SQL' })
    expect(response.status).toBe(401)
  })

  it('protects saved offer comparison behind authentication', async () => {
    const response = await request(app).post('/api/v1/job-analyses/compare').send({ analysisIds: [] })
    expect(response.status).toBe(401)
  })

  it('protects both billing endpoints when no user is authenticated', async () => {
    const checkout = await request(app).post('/api/v1/billing/checkout')
    const portal = await request(app).post('/api/v1/billing/portal')
    expect(checkout.status).toBe(401)
    expect(portal.status).toBe(401)
  })

  it('protects notification generation and actions for unauthenticated users', async () => {
    const list = await request(app).get('/api/v1/notifications')
    const create = await request(app).post('/api/v1/notifications').send({})
    const action = await request(app).patch('/api/v1/notifications/read-all')
    expect(list.status).toBe(401)
    expect(create.status).toBe(401)
    expect(action.status).toBe(401)
  })

  it('exposes the current-user endpoint and protects it without a token', async () => {
    const response = await request(app).get('/api/v1/auth/me')
    expect(response.status).toBe(401)
    expect(response.body.error.message).toBe('Authentification requise.')
  })

  it('does not expose the removed applications placeholder endpoint', async () => {
    const response = await request(app).get('/api/applications')
    expect(response.status).toBe(404)
    expect(response.body.error.message).toBe('Route introuvable.')
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
