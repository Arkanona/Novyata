import { requireDatabase } from '../config/database.js'
import { followupTypes } from '../config/applications.js'
import { AI_FEATURES, capabilitiesFor } from '../config/plans.js'
import { assertAiQuota, consumeAiQuota } from '../services/aiUsageService.js'
import { generateFollowup } from '../services/applicationFollowupService.js'
import ApiError from '../utils/ApiError.js'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
async function owned(database, applicationId, userId) { const result = await database.query('select applications.id_application, applications.company_name, applications.job_title, applications.application_date, applications.status, applications.notes, users.plan from applications join users on users.id_user = applications.id_user where applications.id_application = $1 and applications.id_user = $2', [applicationId, userId]); if (!result.rows[0]) throw new ApiError(404, 'Candidature introuvable.'); return result.rows[0] }
function validId(id) { if (!uuid.test(id)) throw new ApiError(400, 'Identifiant de candidature invalide.') }

export async function createFollowup(req, res, next) { try {
  validId(req.params.id); const type = followupTypes.includes(req.body?.type) ? req.body.type : 'Première relance'; const database = requireDatabase(); const application = await owned(database, req.params.id, req.auth.sub)
  if (type !== 'Première relance' && !capabilitiesFor(application.plan).advancedFollowups) throw new ApiError(403, 'Les relances avancées sont disponibles avec Novyata Pro.', { upgrade: true, feature: 'advancedFollowups' })
  await assertAiQuota(database, req.auth.sub, AI_FEATURES.APPLICATION_FOLLOWUP)
  const generation = await generateFollowup({ type, company: application.company_name, jobTitle: application.job_title, applicationDate: application.application_date, status: application.status, notes: application.notes || undefined })
  await consumeAiQuota(database, req.auth.sub, AI_FEATURES.APPLICATION_FOLLOWUP)
  const result = await database.query('insert into application_followups (id_application, type, content) values ($1, $2, $3) returning id_followup, type, content, sent_at, created_at, updated_at', [req.params.id, type, generation.content])
  return res.status(201).json({ followup: result.rows[0] })
} catch (error) { return next(error) } }

export async function markFollowupSent(req, res, next) { try {
  validId(req.params.id); if (!uuid.test(req.params.followupId)) throw new ApiError(400, 'Identifiant de relance invalide.'); const database = requireDatabase(); await owned(database, req.params.id, req.auth.sub)
  const result = await database.query('update application_followups set sent_at = now() where id_followup = $1 and id_application = $2 and sent_at is null returning id_followup, type, content, sent_at, created_at, updated_at', [req.params.followupId, req.params.id])
  if (result.rows[0]) await database.query('insert into application_events (id_application, type, title, description) values ($1, $2, $3, $4)', [req.params.id, 'followup_sent', 'Relance envoyée', result.rows[0].type])
  if (!result.rows[0]) { const existing = await database.query('select id_followup, type, content, sent_at, created_at, updated_at from application_followups where id_followup = $1 and id_application = $2', [req.params.followupId, req.params.id]); if (!existing.rows[0]) throw new ApiError(404, 'Relance introuvable.'); return res.json({ followup: existing.rows[0] }) }
  return res.json({ followup: result.rows[0] })
} catch (error) { return next(error) } }

export async function updateFollowup(req, res, next) { try {
  validId(req.params.id); if (!uuid.test(req.params.followupId)) throw new ApiError(400, 'Identifiant de relance invalide.')
  const content = typeof req.body?.content === 'string' ? req.body.content.trim() : ''
  if (content.length < 10 || content.length > 2500) throw new ApiError(400, 'Le contenu de la relance doit contenir entre 10 et 2 500 caractères.')
  const database = requireDatabase(); await owned(database, req.params.id, req.auth.sub)
  const result = await database.query('update application_followups set content = $1 where id_followup = $2 and id_application = $3 returning id_followup, type, content, sent_at, created_at, updated_at', [content, req.params.followupId, req.params.id])
  if (!result.rows[0]) throw new ApiError(404, 'Relance introuvable.')
  return res.json({ followup: result.rows[0] })
} catch (error) { return next(error) } }

export async function createThankYou(req, res, next) { try {
  validId(req.params.id); const database = requireDatabase(); const application = await owned(database, req.params.id, req.auth.sub)
  if (!capabilitiesFor(application.plan).advancedFollowups) throw new ApiError(403, 'Les remerciements après entretien sont disponibles avec Novyata Pro.', { upgrade: true, feature: 'advancedFollowups' })
  const interview = await database.query('select interview_date, interview_type, key_points, next_steps, notes from interviews where id_application = $1 order by interview_date desc nulls last, created_at desc limit 1', [req.params.id])
  if (!interview.rows[0]) throw new ApiError(400, 'Ajoutez un compte-rendu d’entretien avant de préparer un remerciement.')
  await assertAiQuota(database, req.auth.sub, AI_FEATURES.APPLICATION_FOLLOWUP)
  const generation = await generateFollowup({ kind: 'thank_you', company: application.company_name, jobTitle: application.job_title, interview: interview.rows[0] })
  await consumeAiQuota(database, req.auth.sub, AI_FEATURES.APPLICATION_FOLLOWUP)
  const result = await database.query('insert into application_followups (id_application, type, content) values ($1, $2, $3) returning id_followup, type, content, sent_at, created_at, updated_at', [req.params.id, 'Remerciement', generation.content])
  return res.status(201).json({ followup: result.rows[0] })
} catch (error) { return next(error) } }
