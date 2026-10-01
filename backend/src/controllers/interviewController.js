import { requireDatabase } from '../config/database.js'
import ApiError from '../utils/ApiError.js'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const text = (value, max = 8000) => typeof value === 'string' ? value.trim().slice(0, max) || null : null

async function assertOwned(database, applicationId, userId) {
  if (!uuid.test(applicationId)) throw new ApiError(400, 'Identifiant de candidature invalide.')
  const result = await database.query('select id_application from applications where id_application = $1 and id_user = $2', [applicationId, userId])
  if (!result.rows[0]) throw new ApiError(404, 'Candidature introuvable.')
}

function input(body = {}) {
  const interviewDate = text(body.interview_date, 40)
  if (interviewDate && Number.isNaN(Date.parse(interviewDate))) throw new ApiError(400, 'La date d’entretien est invalide.')
  return { interviewDate, interviewType: text(body.interview_type, 100), peopleMet: text(body.people_met, 1000), feeling: text(body.feeling, 100), questionsAsked: text(body.questions_asked), keyPoints: text(body.key_points), nextSteps: text(body.next_steps), notes: text(body.notes) }
}
const fields = 'id_interview, interview_date, interview_type, people_met, feeling, questions_asked, key_points, next_steps, notes, created_at, updated_at'

export async function createInterview(req, res, next) { try {
  const database = requireDatabase(); await assertOwned(database, req.params.id, req.auth.sub); const value = input(req.body)
  const result = await database.query(`insert into interviews (id_application, interview_date, interview_type, people_met, feeling, questions_asked, key_points, next_steps, notes) values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning ${fields}`, [req.params.id, value.interviewDate, value.interviewType, value.peopleMet, value.feeling, value.questionsAsked, value.keyPoints, value.nextSteps, value.notes])
  await database.query('insert into application_events (id_application, type, title, description, event_date) values ($1,$2,$3,$4,coalesce($5, now()))', [req.params.id, 'interview_completed', 'Compte-rendu d’entretien ajouté', value.interviewType, value.interviewDate])
  return res.status(201).json({ interview: result.rows[0] })
} catch (error) { return next(error) } }

export async function updateInterview(req, res, next) { try {
  const database = requireDatabase(); await assertOwned(database, req.params.id, req.auth.sub); if (!uuid.test(req.params.interviewId)) throw new ApiError(400, 'Identifiant d’entretien invalide.'); const value = input(req.body)
  const result = await database.query(`update interviews set interview_date=$1, interview_type=$2, people_met=$3, feeling=$4, questions_asked=$5, key_points=$6, next_steps=$7, notes=$8 where id_interview=$9 and id_application=$10 returning ${fields}`, [value.interviewDate, value.interviewType, value.peopleMet, value.feeling, value.questionsAsked, value.keyPoints, value.nextSteps, value.notes, req.params.interviewId, req.params.id])
  if (!result.rows[0]) throw new ApiError(404, 'Entretien introuvable.')
  return res.json({ interview: result.rows[0] })
} catch (error) { return next(error) } }
