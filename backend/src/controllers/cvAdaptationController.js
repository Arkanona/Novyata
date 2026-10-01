import { requireDatabase } from '../config/database.js'
import { proposeCvAdaptation, validateAdaptation } from '../services/cvAdaptationService.js'
import ApiError from '../utils/ApiError.js'
import { AI_FEATURES } from '../config/plans.js'
import { assertAiQuota, consumeAiQuota } from '../services/aiUsageService.js'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const titleForCopy = (resume, analysis) => `${resume.title_resume} — ${analysis.company_name || analysis.job_title || 'adapté'}`.slice(0, 160)

async function loadOwnedSource(database, analysisId, userId) {
  if (!uuidPattern.test(analysisId)) throw new ApiError(400, 'Identifiant d’analyse invalide.')
  const analysisResult = await database.query('select id_job_analysis, id_resume, company_name, job_title, job_description, analysis_result from job_analyses where id_job_analysis = $1 and id_user = $2', [analysisId, userId])
  const analysis = analysisResult.rows[0]
  if (!analysis) throw new ApiError(404, 'Analyse introuvable.')
  const resumeResult = await database.query('select id_resume, title_resume, job_title, first_name, last_name, email, phone, city, summary, template_key, accent_color, font_size from resumes where id_resume = $1 and id_user = $2', [analysis.id_resume, userId])
  const resume = resumeResult.rows[0]
  if (!resume) throw new ApiError(404, 'CV introuvable.')
  const [experiences, educations, skills, languages] = await Promise.all([
    database.query('select job_title, company, city, start_date, end_date, is_current, description from experiences where id_resume = $1 order by start_date desc nulls last, created_at desc', [resume.id_resume]),
    database.query('select degree, school, city, start_date, end_date, description from educations where id_resume = $1 order by start_date desc nulls last, created_at desc', [resume.id_resume]),
    database.query('select name, level from skills where id_resume = $1 order by created_at desc', [resume.id_resume]),
    database.query('select name, level from languages where id_resume = $1 order by created_at desc', [resume.id_resume]),
  ])
  return { analysis, resume: { ...resume, experiences: experiences.rows, educations: educations.rows, skills: skills.rows, languages: languages.rows } }
}

export async function createAdaptationProposals(req, res, next) {
  try {
    const database = requireDatabase()
    const { analysis, resume } = await loadOwnedSource(database, req.params.id, req.auth.sub)
    await assertAiQuota(database, req.auth.sub, AI_FEATURES.CV_ADAPTATION)
    const adaptation = await proposeCvAdaptation({ resume, analysis: analysis.analysis_result, jobDescription: analysis.job_description })
    await consumeAiQuota(database, req.auth.sub, AI_FEATURES.CV_ADAPTATION)
    return res.json({ adaptation })
  } catch (error) { return next(error) }
}

export async function applyCvAdaptation(req, res, next) {
  let client
  try {
    const database = requireDatabase()
    const { analysis, resume } = await loadOwnedSource(database, req.params.id, req.auth.sub)
    const adaptation = validateAdaptation({ proposals: req.body?.proposals }, resume)
    const acceptedIds = Array.isArray(req.body?.acceptedIds) ? req.body.acceptedIds.filter((id) => typeof id === 'string') : []
    const accepted = adaptation.proposals.filter((proposal) => acceptedIds.includes(proposal.id))
    if (accepted.length === 0) throw new ApiError(400, 'Sélectionnez au moins une proposition à appliquer.')
    if (accepted.length !== new Set(acceptedIds).size) throw new ApiError(400, 'Certaines propositions sont invalides.')

    const descriptions = new Map(accepted.filter((item) => item.field === 'experience').map((item) => [item.targetIndex, item.proposedText]))
    const summary = accepted.find((item) => item.field === 'summary')?.proposedText || resume.summary
    client = await database.connect()
    await client.query('begin')
    const copied = await client.query('insert into resumes (id_user, title_resume, job_title, first_name, last_name, email, phone, city, summary, template_key, accent_color, font_size) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) returning id_resume', [req.auth.sub, titleForCopy(resume, analysis), resume.job_title, resume.first_name, resume.last_name, resume.email, resume.phone, resume.city, summary, resume.template_key, resume.accent_color, resume.font_size])
    const idResume = copied.rows[0].id_resume
    for (const [index, experience] of resume.experiences.entries()) await client.query('insert into experiences (id_resume, job_title, company, city, start_date, end_date, is_current, description) values ($1, $2, $3, $4, $5, $6, $7, $8)', [idResume, experience.job_title, experience.company, experience.city, experience.start_date, experience.end_date, experience.is_current, descriptions.get(index) ?? experience.description])
    for (const education of resume.educations) await client.query('insert into educations (id_resume, degree, school, city, start_date, end_date, description) values ($1, $2, $3, $4, $5, $6, $7)', [idResume, education.degree, education.school, education.city, education.start_date, education.end_date, education.description])
    for (const skill of resume.skills) await client.query('insert into skills (id_resume, name, level) values ($1, $2, $3)', [idResume, skill.name, skill.level])
    for (const language of resume.languages) await client.query('insert into languages (id_resume, name, level) values ($1, $2, $3)', [idResume, language.name, language.level])
    await client.query('commit')
    return res.status(201).json({ resume: { id_resume: idResume, title_resume: titleForCopy(resume, analysis) }, appliedCount: accepted.length })
  } catch (error) {
    if (client) await client.query('rollback').catch(() => {})
    return next(error)
  } finally { client?.release() }
}
