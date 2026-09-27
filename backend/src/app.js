import cors from 'cors'
import express from 'express'
import applicationsRouter from './routes/applications.js'
import authRouter from './routes/auth.js'
import resumesRouter from './routes/resumes.js'
import { errorHandler, notFound } from './middleware/errorHandler.js'

const app = express()

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }))
app.use(express.json())
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'novyata-api' }))
app.use('/api/applications', applicationsRouter)
app.use('/api/v1/auth', authRouter)
app.use('/api/v1/resumes', resumesRouter)
app.use(notFound)
app.use(errorHandler)

export default app
