import { requireDatabase } from '../config/database.js'
import { AI_FEATURES } from '../config/plans.js'
import { assertAiQuota, consumeAiQuota } from '../services/aiUsageService.js'
import { generateInterviewPreparation } from '../services/interviewPreparationService.js'
import ApiError from '../utils/ApiError.js'
import { compactSearchProfile } from '../utils/searchProfile.js'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const shorten = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : ''

function compactAnalysis(result) {
  if (!result || typeof result !== 'object') return null
  const requirements = new Map((Array.isArray(result.requirements) ? result.requirements : []).map((item) => [item.id, item.name]).filter(([id, name]) => id && name))
  const pick = (value) => Array.isArray(value) ? value.slice(0, 6).map((item) => typeof item === 'string' ? item : item?.name || requirements.get(item?.requirementId)).filter(Boolean) : []
  return {
    strongMatches: pick(result.strongMatches),
    partialMatches: pick(result.partialMatches),
    importantMissingSkills: pick(result.importantMissingSkills),
    importantKeywords: pick(result.importantKeywords),
  }
}

async function getCompactResume(db, resumeId, userId) {
  const [resume, experiences, educations, skills, languages] = await Promise.all([
    db.query('select job_title, summary from resumes where id_resume = $1 and id_user = $2', [resumeId, userId]),
    db.query('select job_title, company, description from experiences where id_resume = $1 order by start_date desc nulls last, created_at desc limit 8', [resumeId]),
    db.query('select degree, school, description from educations where id_resume = $1 order by start_date desc nulls last, created_at desc limit 5', [resumeId]),
    db.query('select name from skills where id_resume = $1 order by created_at desc limit 15', [resumeId]),
    db.query('select name, level from languages where id_resume = $1 order by created_at desc limit 5', [resumeId]),
  ])
  if (!resume.rows[0]) throw new ApiError(404, 'CV introuvable.')
  return {
    jobTitle: shorten(resume.rows[0].job_title, 160),
    summary: shorten(resume.rows[0].summary, 700),
    experiences: experiences.rows.map((item) => ({ role: shorten(item.job_title, 140), organization: shorten(item.company, 140), description: shorten(item.description, 500) })),
    education: educations.rows.map((item) => ({ degree: shorten(item.degree, 150), school: shorten(item.school, 140), description: shorten(item.description, 250) })),
    skills: skills.rows.map((item) => shorten(item.name, 80)).filter(Boolean),
    languages: languages.rows.map((item) => ({ name: shorten(item.name, 60), level: shorten(item.level, 40) })),
  }
}

export async function createInterviewPreparation(req, res, next) {
  try {
    if (!uuid.test(req.params.id)) throw new ApiError(400, 'Identifiant de candidature invalide.')
    const database = requireDatabase()
    const application = (await database.query(
      'select applications.id_application, applications.id_resume, applications.id_job_analysis, applications.company_name, applications.job_title, users.job_search_preferences from applications join users on users.id_user = applications.id_user where applications.id_application = $1 and applications.id_user = $2',
      [req.params.id, req.auth.sub],
    )).rows[0]
    if (!application) throw new ApiError(404, 'Candidature introuvable.')
    if (!application.id_resume) throw new ApiError(400, 'Associez un CV avant de préparer l’entretien.')

    const [cv, analysisResult] = await Promise.all([
      getCompactResume(database, application.id_resume, req.auth.sub),
      application.id_job_analysis
        ? database.query('select job_description, analysis_result from job_analyses where id_job_analysis = $1 and id_user = $2', [application.id_job_analysis, req.auth.sub])
        : Promise.resolve({ rows: [] }),
    ])
    await assertAiQuota(database, req.auth.sub, AI_FEATURES.INTERVIEW_PREPARATION)
    const analysis = analysisResult.rows[0]
    const preparation = await generateInterviewPreparation({
      company: shorten(application.company_name, 160),
      jobTitle: shorten(application.job_title, 160),
      searchProfile: compactSearchProfile(application.job_search_preferences),
      cv,
      offer: analysis ? {
        jobDescription: shorten(analysis.job_description, 2500),
        analysis: compactAnalysis(analysis.analysis_result),
      } : null,
    })
    await consumeAiQuota(database, req.auth.sub, AI_FEATURES.INTERVIEW_PREPARATION)
    return res.json({ preparation })
  } catch (error) { return next(error) }
}
