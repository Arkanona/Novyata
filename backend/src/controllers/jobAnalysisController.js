import { requireDatabase } from '../config/database.js'
import { analyzeJobDescription } from '../services/jobAnalysisService.js'
import ApiError from '../utils/ApiError.js'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const optionalText = (value, maxLength) => typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
const isDevelopment = () => process.env.NODE_ENV !== 'production'

function logInsertPayload({ userId, resumeId, jobDescription, analysis }) {
  if (!isDevelopment()) return
  let serializable = false
  try { serializable = typeof JSON.stringify(analysis) === 'string' } catch { /* Logged as false. */ }
  console.info('Job analysis INSERT payload:', {
    idUserType: typeof userId,
    idUserIsUuid: uuidPattern.test(userId || ''),
    idResumeType: typeof resumeId,
    idResumeIsUuid: uuidPattern.test(resumeId || ''),
    matchScore: analysis?.matchScore,
    matchScoreType: typeof analysis?.matchScore,
    matchScoreIsInteger: Number.isInteger(analysis?.matchScore),
    analysisResultType: typeof analysis,
    analysisResultSerializable: serializable,
    jobDescriptionPresent: typeof jobDescription === 'string' && jobDescription.trim().length > 0,
  })
}

function logInsertError(error) {
  if (!isDevelopment()) return
  console.error('Job analysis INSERT failed:', {
    code: error.code,
    constraint: error.constraint,
    detail: error.detail,
    column: error.column,
    table: error.table,
    message: error.message,
  })
}

function validateRequest(body) {
  const resumeId = typeof body.resumeId === 'string' ? body.resumeId.trim() : ''
  const jobDescription = typeof body.jobDescription === 'string' ? body.jobDescription.trim() : ''
  const errors = {}
  if (!resumeId || !uuidPattern.test(resumeId)) errors.resumeId = 'Sélectionnez un CV valide.'
  if (!jobDescription) errors.jobDescription = 'Collez le texte de l’offre avant de lancer l’analyse.'
  if (jobDescription && jobDescription.length > 20000) errors.jobDescription = 'L’offre ne peut pas dépasser 20 000 caractères.'
  if (Object.keys(errors).length) throw new ApiError(400, 'Certaines informations sont invalides.', errors)
  return { resumeId, jobDescription, companyName: optionalText(body.companyName, 160), jobTitle: optionalText(body.jobTitle, 160) }
}

export async function analyzeJob(req, res, next) {
  try {
    const { resumeId, jobDescription, companyName, jobTitle } = validateRequest(req.body)
    const database = requireDatabase()
    const resumeResult = await database.query('select id_resume, title_resume, job_title, first_name, last_name, email, phone, city, summary from resumes where id_resume = $1 and id_user = $2', [resumeId, req.auth.sub])
    const resume = resumeResult.rows[0]
    if (!resume) throw new ApiError(404, 'CV introuvable.')
    const [experiences, educations, skills, languages] = await Promise.all([
      database.query('select job_title, company, description from experiences where id_resume = $1', [resumeId]),
      database.query('select degree, school, description from educations where id_resume = $1', [resumeId]),
      database.query('select name, level from skills where id_resume = $1', [resumeId]),
      database.query('select name, level from languages where id_resume = $1', [resumeId]),
    ])
    const analysis = await analyzeJobDescription({ resume: { ...resume, experiences: experiences.rows, educations: educations.rows, skills: skills.rows, languages: languages.rows }, jobDescription })
    const serializedAnalysis = JSON.stringify(analysis)
    logInsertPayload({ userId: req.auth.sub, resumeId, jobDescription, analysis })
    let saved
    try {
      saved = await database.query(
        'insert into job_analyses (id_user, id_resume, company_name, job_title, job_description, match_score, analysis_result) values ($1, $2, $3, $4, $5, $6, $7::jsonb) returning id_job_analysis, created_at, updated_at',
        [req.auth.sub, resumeId, companyName || null, jobTitle || resume.job_title || null, jobDescription, analysis.matchScore, serializedAnalysis],
      )
    } catch (error) {
      logInsertError(error)
      throw error
    }
    return res.status(201).json({ analysis: { ...analysis, id_job_analysis: saved.rows[0].id_job_analysis, created_at: saved.rows[0].created_at, updated_at: saved.rows[0].updated_at } })
  } catch (error) { return next(error) }
}
