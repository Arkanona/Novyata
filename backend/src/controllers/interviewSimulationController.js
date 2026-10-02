import { requireDatabase } from '../config/database.js'
import { AI_FEATURES } from '../config/plans.js'
import { assertAiQuota, consumeAiQuota } from '../services/aiUsageService.js'
import { simulateInterview } from '../services/interviewSimulationService.js'
import ApiError from '../utils/ApiError.js'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function compactAnalysis(result) {
  if (!result || typeof result !== 'object') return null
  const pick = (value) => Array.isArray(value) ? value.slice(0, 6).map((item) => typeof item === 'string' ? item : item?.name).filter(Boolean) : []
  return {
    strongMatches: pick(result.strongMatches),
    partialMatches: pick(result.partialMatches),
    importantMissingSkills: pick(result.importantMissingSkills),
    importantKeywords: pick(result.importantKeywords)
  }
}

async function getSimulationContext(db, application, userId) {
  const [resumeResult, analysisResult] = await Promise.all([
    application.id_resume
      ? db.query('select job_title, summary from resumes where id_resume = $1 and id_user = $2', [application.id_resume, userId])
      : Promise.resolve({ rows: [] }),
    application.id_job_analysis
      ? db.query('select job_description, analysis_result from job_analyses where id_job_analysis = $1 and id_user = $2', [application.id_job_analysis, userId])
      : Promise.resolve({ rows: [] })
  ])

  return {
    company: application.company_name,
    jobTitle: application.job_title,
    cv: resumeResult.rows[0] || null,
    offer: analysisResult.rows[0]
      ? { jobDescription: String(analysisResult.rows[0].job_description || '').slice(0, 2500), analysis: compactAnalysis(analysisResult.rows[0].analysis_result) }
      : null,
    notes: application.notes ? String(application.notes).slice(0, 600) : null
  }
}

export async function createInterviewSimulation(req, res, next) {
  try {
    if (!uuid.test(req.params.id)) throw new ApiError(400, 'Identifiant de candidature invalide.')
    const db = requireDatabase()
    const application = (await db.query(
      'select company_name, job_title, id_resume, id_job_analysis, notes from applications where id_application = $1 and id_user = $2',
      [req.params.id, req.auth.sub]
    )).rows[0]
    if (!application) throw new ApiError(404, 'Candidature introuvable.')

    const answer = typeof req.body?.answer === 'string' ? req.body.answer.trim().slice(0, 4000) : ''
    let previous = null
    if (req.body?.sessionId) {
      if (!uuid.test(req.body.sessionId)) throw new ApiError(400, 'Identifiant de simulation invalide.')
      previous = await db.query(
        'select id_interview_session, status, exchanges, created_at, updated_at from interview_sessions where id_interview_session = $1 and id_application = $2 and id_user = $3',
        [req.body.sessionId, req.params.id, req.auth.sub]
      )
      if (!previous.rows[0]) throw new ApiError(404, 'Simulation introuvable.')
      if (previous.rows[0].status === 'completed') throw new ApiError(409, 'Cette simulation est terminée. Démarrez-en une nouvelle.')
    }

    await assertAiQuota(db, req.auth.sub, AI_FEATURES.INTERVIEW_SIMULATION)
    const simulation = await simulateInterview({ ...await getSimulationContext(db, application, req.auth.sub), answer: answer || null })
    await consumeAiQuota(db, req.auth.sub, AI_FEATURES.INTERVIEW_SIMULATION)

    const exchanges = [...(previous?.rows[0]?.exchanges || []), {
      answer,
      feedback: simulation.feedback,
      question: simulation.question,
      created_at: new Date().toISOString()
    }]
    const saved = previous
      ? await db.query(
        'update interview_sessions set exchanges = $1 where id_interview_session = $2 returning id_interview_session, status, exchanges, jsonb_array_length(exchanges) as progress, created_at, updated_at',
        [JSON.stringify(exchanges), req.body.sessionId]
      )
      : await db.query(
        "insert into interview_sessions (id_application, id_user, status, exchanges) values ($1, $2, 'in_progress', $3) returning id_interview_session, status, exchanges, jsonb_array_length(exchanges) as progress, created_at, updated_at",
        [req.params.id, req.auth.sub, JSON.stringify(exchanges)]
      )

    return res.json({ simulation, session: saved.rows[0] })
  } catch (error) {
    return next(error)
  }
}

export async function completeInterviewSimulation(req, res, next) {
  try {
    if (!uuid.test(req.params.id) || !uuid.test(req.params.sessionId)) throw new ApiError(400, 'Identifiant de simulation invalide.')
    const saved = await requireDatabase().query(
      "update interview_sessions set status = 'completed' where id_interview_session = $1 and id_application = $2 and id_user = $3 and status = 'in_progress' returning id_interview_session, status, exchanges, jsonb_array_length(exchanges) as progress, created_at, updated_at",
      [req.params.sessionId, req.params.id, req.auth.sub]
    )
    if (!saved.rows[0]) throw new ApiError(404, 'Simulation introuvable ou déjà terminée.')
    return res.json({ session: saved.rows[0] })
  } catch (error) {
    return next(error)
  }
}
