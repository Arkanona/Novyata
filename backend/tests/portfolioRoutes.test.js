import { describe, expect, it } from 'vitest'
import request from 'supertest'
import app from '../src/app.js'

describe('portfolio route security', () => {
  it('keeps public profile editing behind authentication', async () => {
    const response = await request(app).put('/api/v1/portfolio/me').send({ slug: 'test', visible_sections: {} })
    expect(response.status).toBe(401)
  })

  it('keeps share-link creation behind authentication', async () => {
    const response = await request(app).post('/api/v1/resumes/f8c5d2f2-6ff2-43d2-9e4f-5443200f6d4b/share-links').send({})
    expect(response.status).toBe(401)
  })

  it('keeps weekly goal preferences behind authentication', async () => {
    const response = await request(app).put('/api/v1/weekly-goals').send({ is_enabled: true })
    expect(response.status).toBe(401)
  })
})
