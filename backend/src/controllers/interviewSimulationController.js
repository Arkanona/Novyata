import { requireDatabase } from '../config/database.js'
import { AI_FEATURES, capabilitiesFor } from '../config/plans.js'
import { runWithAiQuota } from '../services/aiUsageService.js'
import { simulateInterview } from '../services/interviewSimulationService.js'
import { normalizeInterviewExchanges } from '../utils/interviewSessions.js'
import { compactSearchProfile } from '../utils/searchProfile.js'
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
      ? { jobDescription: String(analysisResult.rows[0].job_description || ''), analysis: compactAnalysis(analysisResult.rows[0].analysis_result) }
      : null,
    notes: application.notes || null
  }
}

export async function createInterviewSimulation(req, res, next) {
  try {
    if (!uuid.test(req.params.id)) throw new ApiError(400, 'Identifiant de candidature invalide.')
    const db = requireDatabase()
    const application = (await db.query(
      'select applications.company_name, applications.job_title, applications.id_resume, applications.id_job_analysis, applications.notes, users.job_search_preferences from applications join users on users.id_user = applications.id_user where applications.id_application = $1 and applications.id_user = $2',
      [req.params.id, req.auth.sub]
    )).rows[0]
    if (!application) throw new ApiError(404, 'Candidature introuvable.')

    const answer = typeof req.body?.answer === 'string' ? req.body.answer.trim() : ''
    if (answer.length > 4000) throw new ApiError(400, 'Une réponse de simulation ne peut pas dépasser 4 000 caractères.')
    let previous = null
    if (req.body?.sessionId) {
      if (!uuid.test(req.body.sessionId)) throw new ApiError(400, 'Identifiant de simulation invalide.')
      previous = await db.query(
        'select id_interview_session, status, exchanges, created_at, updated_at from interview_sessions where id_interview_session = $1 and id_application = $2 and id_user = $3',
        [req.body.sessionId, req.params.id, req.auth.sub]
      )
      if (!previous.rows[0]) throw new ApiError(404, 'Simulation introuvable.')
      if (previous.rows[0].status === 'completed') throw new ApiError(409, 'Cette simulation est terminée. Démarrez-en une nouvelle.')
      const existingExchanges = normalizeInterviewExchanges(previous.rows[0].exchanges)
      const latest = existingExchanges.at(-1)
      if (!latest) throw new ApiError(409, 'Aucune question en attente dans cette simulation.')
      if (latest.answer && latest.feedback) throw new ApiError(409, 'Aucune question en attente dans cette simulation.')
      if (!latest.answer && !answer) throw new ApiError(400, 'Rédigez votre réponse avant de continuer la simulation.')
      if (!latest.answer) {
        latest.answer = answer
        latest.answered_at = new Date().toISOString()
        const savedAnswer = await db.query('update interview_sessions set exchanges = $1 where id_interview_session = $2 and id_application = $3 and id_user = $4 returning id_interview_session', [JSON.stringify(existingExchanges), req.body.sessionId, req.params.id, req.auth.sub])
        if (!savedAnswer.rows[0]) throw new ApiError(404, 'Simulation introuvable.')
      }
      previous.rows[0].exchanges = existingExchanges
    }

    const evaluatedAnswer = previous ? previous.rows[0].exchanges.at(-1).answer : answer
    const context = { ...await getSimulationContext(db, application, req.auth.sub), searchProfile: compactSearchProfile(application.job_search_preferences), answer: evaluatedAnswer || null }
    const simulation = await runWithAiQuota(db, req.auth.sub, AI_FEATURES.INTERVIEW_SIMULATION, ({ plan, onRequestStart }) => simulateInterview({ ...context, tier: capabilitiesFor(plan).advancedInterview ? 'pro' : 'free' }, { onRequestStart }))

    const exchanges = normalizeInterviewExchanges(previous?.rows[0]?.exchanges || [])
    const now = new Date().toISOString()
    if (previous) {
      const pending = exchanges.at(-1)
      if (!pending?.answer || pending.feedback) throw new ApiError(409, 'Aucune réponse à analyser dans cette simulation.')
      pending.feedback = simulation.feedback
      pending.answered_at ||= now
      exchanges.push({ question: simulation.question, answer: '', feedback: null, created_at: now })
    } else {
      exchanges.push({ question: simulation.question, answer: '', feedback: null, created_at: now })
    }
    const saved = previous
      ? await db.query(
        'update interview_sessions set exchanges = $1 where id_interview_session = $2 returning id_interview_session, status, exchanges, jsonb_array_length(exchanges) as progress, created_at, updated_at',
        [JSON.stringify(exchanges), req.body.sessionId]
      )
      : await db.query(
        "insert into interview_sessions (id_application, id_user, status, exchanges) values ($1, $2, 'in_progress', $3) returning id_interview_session, status, exchanges, jsonb_array_length(exchanges) as progress, created_at, updated_at",
        [req.params.id, req.auth.sub, JSON.stringify(exchanges)]
      )

    return res.json({ simulation: { question: simulation.question, feedback: previous ? simulation.feedback : null }, session: { ...saved.rows[0], exchanges: normalizeInterviewExchanges(saved.rows[0].exchanges) } })
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
