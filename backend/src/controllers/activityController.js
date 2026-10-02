import { requireDatabase } from '../config/database.js'
import ApiError from '../utils/ApiError.js'

const formatItem = (kind, id, title, subtitle, date, href) => ({ kind, id, title, subtitle: subtitle || null, date, href })

export async function listActivity(req, res, next) {
  try {
    const database = requireDatabase()
    const account = await database.query('select plan from users where id_user=$1', [req.auth.sub])
    if (!account.rows[0]) throw new ApiError(401, 'Utilisateur introuvable.')
    if (account.rows[0].plan !== 'pro') throw new ApiError(403, 'L’historique complet est disponible avec Novyata Pro.', { upgrade: true })

    const [analyses, letters, variants, simulations, followups] = await Promise.all([
      database.query('select id_job_analysis,company_name,job_title,created_at from job_analyses where id_user=$1 order by created_at desc', [req.auth.sub]),
      database.query('select id_cover_letter,title,company_name,job_title,created_at from cover_letters where id_user=$1 order by created_at desc', [req.auth.sub]),
      database.query('select id_resume,title_resume,job_title,updated_at from resumes where id_user=$1 and parent_resume_id is not null order by updated_at desc', [req.auth.sub]),
      database.query('select sessions.id_interview_session,sessions.status,sessions.created_at,applications.id_application,applications.company_name,applications.job_title from interview_sessions sessions join applications on applications.id_application=sessions.id_application where sessions.id_user=$1 and applications.id_user=$1 order by sessions.created_at desc', [req.auth.sub]),
      database.query('select followups.id_followup,followups.type,followups.created_at,applications.id_application,applications.company_name,applications.job_title from application_followups followups join applications on applications.id_application=followups.id_application where applications.id_user=$1 order by followups.created_at desc', [req.auth.sub]),
    ])

    const items = [
      ...analyses.rows.map((row) => formatItem('Analyse d’offre', row.id_job_analysis, row.company_name || row.job_title || 'Analyse d’offre', row.job_title, row.created_at, `/analyses/${row.id_job_analysis}`)),
      ...letters.rows.map((row) => formatItem('Lettre de motivation', row.id_cover_letter, row.title, [row.company_name, row.job_title].filter(Boolean).join(' · '), row.created_at, `/lettres/${row.id_cover_letter}`)),
      ...variants.rows.map((row) => formatItem('Variante de CV', row.id_resume, row.title_resume, row.job_title, row.updated_at, `/cv/${row.id_resume}`)),
      ...simulations.rows.map((row) => formatItem('Simulation d’entretien', row.id_interview_session, row.company_name || 'Simulation d’entretien', row.status === 'completed' ? 'Terminée' : row.job_title, row.created_at, `/candidatures/${row.id_application}`)),
      ...followups.rows.map((row) => formatItem(row.type === 'Remerciement' ? 'Remerciement' : 'Relance', row.id_followup, row.company_name || row.type, row.job_title, row.created_at, `/candidatures/${row.id_application}`)),
    ].sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())

    return res.json({ activity: items })
  } catch (error) { return next(error) }
}
