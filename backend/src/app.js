import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import applicationsRouter from './routes/applications.js'
import authRouter from './routes/auth.js'
import coverLettersRouter from './routes/coverLetters.js'
import coverLetterGenerationRouter from './routes/coverLetterGeneration.js'
import jobAnalysisRouter from './routes/jobAnalysis.js'
import resumesRouter from './routes/resumes.js'
import { errorHandler, notFound } from './middleware/errorHandler.js'

const app = express()
const localDevelopmentOrigins = ['http://localhost:5173', 'http://localhost:5174']
const configuredOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
const allowedOrigins = [...new Set([...localDevelopmentOrigins, ...configuredOrigins])]
const numericEnvironment = (name, fallback) => {
  const value = Number.parseInt(process.env[name], 10)
  return Number.isFinite(value) && value > 0 ? value : fallback
}
const apiLimiter = rateLimit({
  windowMs: numericEnvironment('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
  max: numericEnvironment('RATE_LIMIT_MAX', 200),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: { message: 'Trop de requêtes. Réessayez dans quelques instants.' } },
})
const aiLimiter = rateLimit({
  windowMs: numericEnvironment('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
  max: numericEnvironment('AI_RATE_LIMIT_MAX', 20),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: { message: 'Trop de demandes IA. Réessayez dans quelques instants.' } },
})

if (process.env.TRUST_PROXY === 'true') app.set('trust proxy', 1)

app.use(helmet())
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true)
    }
    return callback(new Error('Origine non autorisée par CORS.'))
  },
}))
app.use(express.json({ limit: '100kb' }))
app.use('/api', apiLimiter)
app.get('/api/health', (req, res) => res.json({
  status: 'ok',
  service: 'novyata-api',
  databaseConfigured: Boolean(process.env.DATABASE_URL),
  jwtConfigured: Boolean(process.env.JWT_SECRET),
}))
app.use('/api/v1/applications', applicationsRouter)
app.use('/api/v1/auth', authRouter)
app.use('/api/v1/cover-letters', coverLettersRouter)
app.use('/api/v1/cover-letter-generation', aiLimiter, coverLetterGenerationRouter)
app.use('/api/v1/job-analysis', aiLimiter, jobAnalysisRouter)
app.use('/api/v1/resumes', resumesRouter)
app.use(notFound)
app.use(errorHandler)

export default app
