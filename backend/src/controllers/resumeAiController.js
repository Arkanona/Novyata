import { requireDatabase } from '../config/database.js'
import { AI_FEATURES } from '../config/plans.js'
import { assertAiQuota, consumeAiQuota } from '../services/aiUsageService.js'
import { generateProfessionalSummary, improveExperienceDescription, improveProfessionalSummary } from '../services/resumeAiService.js'
import ApiError from '../utils/ApiError.js'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const compact = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : ''

export async function createProfessionalSummary(req, res, next) {
  try {
    if (!uuid.test(req.params.id || '')) throw new ApiError(400, 'Identifiant de CV invalide.')
    const database = requireDatabase()
    const resume = (await database.query('select job_title, summary from resumes where id_resume=$1 and id_user=$2', [req.params.id, req.auth.sub])).rows[0]
    if (!resume) throw new ApiError(404, 'CV introuvable.')
    const [experiences, educations, skills] = await Promise.all([
      database.query('select job_title, company, description from experiences where id_resume=$1 order by start_date desc nulls last, created_at desc limit 8', [req.params.id]),
      database.query('select degree, school, description from educations where id_resume=$1 order by start_date desc nulls last, created_at desc limit 5', [req.params.id]),
      database.query('select name from skills where id_resume=$1 order by created_at desc limit 15', [req.params.id]),
    ])
    const context = {
      jobTitle: compact(resume.job_title, 160),
      currentSummary: compact(resume.summary, 650),
      experiences: experiences.rows.map((item) => ({ role: compact(item.job_title, 140), organization: compact(item.company, 140), description: compact(item.description, 450) })).filter((item) => item.role || item.organization || item.description),
      education: educations.rows.map((item) => ({ degree: compact(item.degree, 150), school: compact(item.school, 140), description: compact(item.description, 250) })).filter((item) => item.degree || item.school || item.description),
      skills: skills.rows.map((item) => compact(item.name, 80)).filter(Boolean),
    }
    if (!context.jobTitle && !context.currentSummary && !context.experiences.length && !context.education.length && !context.skills.length) throw new ApiError(400, 'Ajoutez des informations à votre CV avant de générer un résumé.')
    await assertAiQuota(database, req.auth.sub, AI_FEATURES.RESUME_SUMMARY)
    const result = await generateProfessionalSummary(context)
    await consumeAiQuota(database, req.auth.sub, AI_FEATURES.RESUME_SUMMARY)
    return res.json({ suggestion: result.summary })
  } catch (error) { return next(error) }
}

export async function improveResumeSummary(req, res, next) {
  try {
    if (!uuid.test(req.params.id || '')) throw new ApiError(400, 'Identifiant de CV invalide.')
    const sourceText = compact(req.body?.text, 650)
    if (sourceText.length < 20) throw new ApiError(400, 'Le résumé doit contenir au moins 20 caractères pour être reformulé.')
    const database = requireDatabase()
    const owned = await database.query('select 1 from resumes where id_resume=$1 and id_user=$2', [req.params.id, req.auth.sub])
    if (!owned.rows[0]) throw new ApiError(404, 'CV introuvable.')
    await assertAiQuota(database, req.auth.sub, AI_FEATURES.RESUME_SUMMARY)
    const result = await improveProfessionalSummary(sourceText)
    await consumeAiQuota(database, req.auth.sub, AI_FEATURES.RESUME_SUMMARY)
    return res.json({ suggestion: result.summary })
  } catch (error) { return next(error) }
}

export async function createExperienceImprovement(req, res, next) {
  try {
    if (!uuid.test(req.params.id || '') || !uuid.test(req.params.experienceId || '')) throw new ApiError(400, 'Identifiant invalide.')
    const database = requireDatabase()
    const experience = (await database.query('select e.job_title, e.company, e.description from experiences e join resumes r on r.id_resume=e.id_resume where r.id_resume=$1 and r.id_user=$2 and e.id_experience=$3', [req.params.id, req.auth.sub, req.params.experienceId])).rows[0]
    if (!experience) throw new ApiError(404, 'Expérience introuvable.')
    const sourceText = compact(req.body?.text || experience.description, 1200)
    if (sourceText.length < 10) throw new ApiError(400, 'Ajoutez une description suffisamment complète avant de la reformuler.')
    await assertAiQuota(database, req.auth.sub, AI_FEATURES.EXPERIENCE_REWRITE)
    const result = await improveExperienceDescription({ text: sourceText })
    await consumeAiQuota(database, req.auth.sub, AI_FEATURES.EXPERIENCE_REWRITE)
    return res.json({ suggestion: result.description })
  } catch (error) { return next(error) }
}
