import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import applicationsRouter from '../src/routes/applications.js'
import coverLetterGenerationRouter from '../src/routes/coverLetterGeneration.js'
import cvAdaptationRouter from '../src/routes/cvAdaptation.js'
import jobAnalysisRouter from '../src/routes/jobAnalysis.js'
import resumeAiRouter from '../src/routes/resumeAi.js'
import { errorHandler } from '../src/middleware/errorHandler.js'

describe('AI route authentication', () => {
  it('requires authentication for every OpenAI feature route', async () => {
    const app = express()
    app.use(express.json())
    app.use('/api/v1/job-analysis', jobAnalysisRouter)
    app.use('/api/v1/cover-letter-generation', coverLetterGenerationRouter)
    app.use('/api/v1/job-analyses/:id/cv-adaptation', cvAdaptationRouter)
    app.use('/api/v1/resume-tools', resumeAiRouter)
    app.use('/api/v1/applications', applicationsRouter)
    app.use(errorHandler)
    const routes = [
      '/api/v1/job-analysis',
      '/api/v1/cover-letter-generation',
      '/api/v1/job-analyses/3b74e3e1-64b4-46f1-bfd8-c50a174cf908/cv-adaptation',
      '/api/v1/resume-tools/3b74e3e1-64b4-46f1-bfd8-c50a174cf908/summary',
      '/api/v1/applications/7b74e3e1-64b4-46f1-bfd8-c50a174cf908/followups',
      '/api/v1/applications/7b74e3e1-64b4-46f1-bfd8-c50a174cf908/thank-you',
      '/api/v1/applications/7b74e3e1-64b4-46f1-bfd8-c50a174cf908/interview-preparation',
      '/api/v1/applications/7b74e3e1-64b4-46f1-bfd8-c50a174cf908/interview-simulation',
    ]
    for (const route of routes) {
      const response = await request(app).post(route).send({})
      expect(response.status, route).toBe(401)
    }
  })
})
