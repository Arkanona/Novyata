import cors from 'cors'
import express from 'express'
import applicationsRouter from './routes/applications.js'
import authRouter from './routes/auth.js'
import resumesRouter from './routes/resumes.js'
import { errorHandler, notFound } from './middleware/errorHandler.js'

const app = express()
const localDevelopmentOrigins = ['http://localhost:5173', 'http://localhost:5174']
const configuredOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
const allowedOrigins = [...new Set([...localDevelopmentOrigins, ...configuredOrigins])]

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true)
    }
    return callback(new Error('Origine non autorisée par CORS.'))
  },
}))
app.use(express.json())
app.get('/api/health', (req, res) => res.json({
  status: 'ok',
  service: 'novyata-api',
  databaseConfigured: Boolean(process.env.DATABASE_URL),
  jwtConfigured: Boolean(process.env.JWT_SECRET),
}))
app.use('/api/applications', applicationsRouter)
app.use('/api/v1/auth', authRouter)
app.use('/api/v1/resumes', resumesRouter)
app.use(notFound)
app.use(errorHandler)

export default app
