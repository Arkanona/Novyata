import { requireDatabase } from '../config/database.js'
import { generateCoverLetter } from '../services/coverLetterGenerationService.js'
import ApiError from '../utils/ApiError.js'
import { AI_FEATURES } from '../config/plans.js'
import { runWithAiQuota } from '../services/aiUsageService.js'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function optionalText(value, maxLength) {
  const text = typeof value === 'string' ? value.trim() : ''
  return text && text.length <= maxLength ? text : ''
}

function analysisTextList(value, limit = 12) {
  if (!Array.isArray(value)) return []
  return value
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, limit)
    .map((item) => item.slice(0, 180))
}

function analysisContext(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return {
    matchedSkills: analysisTextList(value.matchedSkills).concat(
      (Array.isArray(value.strongMatches) ? value.strongMatches : []).map((item) => item?.name),
      (Array.isArray(value.partialMatches) ? value.partialMatches : []).map((item) => item?.name),
    ).filter((item, index, items) => typeof item === 'string' && items.indexOf(item) === index).slice(0, 12),
    importantKeywords: analysisTextList(value.importantKeywords),
    suggestions: analysisTextList(value.suggestions, 8),
  }
}

function validateRequest(body) {
  const resumeId = typeof body.resumeId === 'string' ? body.resumeId.trim() : ''
  const jobDescription = typeof body.jobDescription === 'string' ? body.jobDescription.trim() : ''
  const errors = {}
  if (!resumeId || !uuidPattern.test(resumeId)) errors.resumeId = 'Sélectionnez un CV valide.'
  if (!jobDescription) errors.jobDescription = 'Collez le texte de l’offre avant de générer une lettre.'
  if (jobDescription.length > 12000) errors.jobDescription = 'L’offre ne peut pas dépasser 12 000 caractères.'
  if (typeof body.companyName === 'string' && body.companyName.trim().length > 160) errors.companyName = 'Le nom de l’entreprise ne peut pas dépasser 160 caractères.'
  if (typeof body.jobTitle === 'string' && body.jobTitle.trim().length > 160) errors.jobTitle = 'Le poste ne peut pas dépasser 160 caractères.'
  if (Object.keys(errors).length) throw new ApiError(400, 'Certaines informations sont invalides.', errors)
  return {
    resumeId,
    jobDescription,
    companyName: optionalText(body.companyName, 160),
    jobTitle: optionalText(body.jobTitle, 160),
    analysis: analysisContext(body.analysis),
  }
}

export async function createGeneratedCoverLetter(req, res, next) {
  try {
    const { resumeId, jobDescription, companyName, jobTitle, analysis } = validateRequest(req.body)
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
    const generation = await runWithAiQuota(database, req.auth.sub, AI_FEATURES.COVER_LETTER_GENERATION, ({ onRequestStart }) => generateCoverLetter({
      resume: { ...resume, experiences: experiences.rows, educations: educations.rows, skills: skills.rows, languages: languages.rows },
      jobDescription, companyName, jobTitle, analysis, onRequestStart,
    }))
    return res.json({ generation })
  } catch (error) { return next(error) }
}
