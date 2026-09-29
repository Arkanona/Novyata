import { requireDatabase } from '../config/database.js'
import { generateCoverLetter } from '../services/coverLetterGenerationService.js'
import ApiError from '../utils/ApiError.js'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function optionalText(value, maxLength) {
  const text = typeof value === 'string' ? value.trim() : ''
  return text ? text.slice(0, maxLength) : ''
}

function validateRequest(body) {
  const resumeId = typeof body.resumeId === 'string' ? body.resumeId.trim() : ''
  const jobDescription = typeof body.jobDescription === 'string' ? body.jobDescription.trim() : ''
  const errors = {}
  if (!resumeId || !uuidPattern.test(resumeId)) errors.resumeId = 'Sélectionnez un CV valide.'
  if (!jobDescription) errors.jobDescription = 'Collez le texte de l’offre avant de générer une lettre.'
  if (jobDescription.length > 20000) errors.jobDescription = 'L’offre ne peut pas dépasser 20 000 caractères.'
  if (Object.keys(errors).length) throw new ApiError(400, 'Certaines informations sont invalides.', errors)
  return { resumeId, jobDescription, companyName: optionalText(body.companyName, 160), jobTitle: optionalText(body.jobTitle, 160) }
}

export async function createGeneratedCoverLetter(req, res, next) {
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
    const generation = await generateCoverLetter({
      resume: { ...resume, experiences: experiences.rows, educations: educations.rows, skills: skills.rows, languages: languages.rows },
      jobDescription,
      companyName,
      jobTitle,
    })
    return res.json({ generation })
  } catch (error) { return next(error) }
}
