import { requireDatabase } from '../config/database.js'
import ApiError from '../utils/ApiError.js'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const datePattern = /^\d{4}-\d{2}-\d{2}$/

function optionalText(value) {
  return value?.trim() || null
}

function validateDates(startDate, endDate, errors) {
  if (startDate && !datePattern.test(startDate)) errors.start_date = 'Date de début invalide.'
  if (endDate && !datePattern.test(endDate)) errors.end_date = 'Date de fin invalide.'
  if (startDate && endDate && startDate > endDate) errors.end_date = 'La date de fin doit être postérieure à la date de début.'
}

function validateExperience(body) {
  const errors = {}
  const jobTitle = optionalText(body.job_title)
  const company = optionalText(body.company)
  const city = optionalText(body.city)
  const startDate = optionalText(body.start_date)
  const isCurrent = Boolean(body.is_current)
  const endDate = isCurrent ? null : optionalText(body.end_date)
  const description = optionalText(body.description)
  if (!jobTitle || jobTitle.length < 2) errors.job_title = 'Le poste doit contenir au moins 2 caractères.'
  if (!company || company.length < 2) errors.company = 'L’entreprise doit contenir au moins 2 caractères.'
  validateDates(startDate, endDate, errors)
  if (Object.keys(errors).length) throw new ApiError(400, 'Certaines informations sont invalides.', errors)
  return { jobTitle, company, city, startDate, endDate, isCurrent, description }
}

function validateEducation(body) {
  const errors = {}
  const degree = optionalText(body.degree)
  const school = optionalText(body.school)
  const city = optionalText(body.city)
  const startDate = optionalText(body.start_date)
  const endDate = optionalText(body.end_date)
  const description = optionalText(body.description)
  if (!degree || degree.length < 2) errors.degree = 'Le diplôme doit contenir au moins 2 caractères.'
  if (!school || school.length < 2) errors.school = 'L’établissement doit contenir au moins 2 caractères.'
  validateDates(startDate, endDate, errors)
  if (Object.keys(errors).length) throw new ApiError(400, 'Certaines informations sont invalides.', errors)
  return { degree, school, city, startDate, endDate, description }
}

function validateIds(resumeId, itemId) {
  if (!uuidPattern.test(resumeId) || (itemId && !uuidPattern.test(itemId))) throw new ApiError(400, 'Identifiant invalide.')
}

export async function createExperience(req, res, next) {
  try {
    validateIds(req.params.id)
    const experience = validateExperience(req.body)
    const result = await requireDatabase().query(
      'insert into experiences (id_resume, job_title, company, city, start_date, end_date, is_current, description) select id_resume, $1, $2, $3, $4, $5, $6, $7 from resumes where id_resume = $8 and id_user = $9 returning id_experience, id_resume, job_title, company, city, start_date, end_date, is_current, description, created_at, updated_at',
      [experience.jobTitle, experience.company, experience.city, experience.startDate, experience.endDate, experience.isCurrent, experience.description, req.params.id, req.auth.sub],
    )
    if (!result.rows[0]) throw new ApiError(404, 'CV introuvable.')
    return res.status(201).json({ experience: result.rows[0] })
  } catch (error) { return next(error) }
}

export async function updateExperience(req, res, next) {
  try {
    validateIds(req.params.id, req.params.experienceId)
    const experience = validateExperience(req.body)
    const result = await requireDatabase().query(
      'update experiences as experience set job_title = $1, company = $2, city = $3, start_date = $4, end_date = $5, is_current = $6, description = $7 from resumes where experience.id_experience = $8 and experience.id_resume = $9 and resumes.id_resume = experience.id_resume and resumes.id_user = $10 returning experience.id_experience, experience.id_resume, experience.job_title, experience.company, experience.city, experience.start_date, experience.end_date, experience.is_current, experience.description, experience.created_at, experience.updated_at',
      [experience.jobTitle, experience.company, experience.city, experience.startDate, experience.endDate, experience.isCurrent, experience.description, req.params.experienceId, req.params.id, req.auth.sub],
    )
    if (!result.rows[0]) throw new ApiError(404, 'Expérience introuvable.')
    return res.json({ experience: result.rows[0] })
  } catch (error) { return next(error) }
}

export async function deleteExperience(req, res, next) {
  try {
    validateIds(req.params.id, req.params.experienceId)
    const result = await requireDatabase().query('delete from experiences as experience using resumes where experience.id_experience = $1 and experience.id_resume = $2 and resumes.id_resume = experience.id_resume and resumes.id_user = $3 returning experience.id_experience', [req.params.experienceId, req.params.id, req.auth.sub])
    if (!result.rows[0]) throw new ApiError(404, 'Expérience introuvable.')
    return res.status(204).send()
  } catch (error) { return next(error) }
}

export async function createEducation(req, res, next) {
  try {
    validateIds(req.params.id)
    const education = validateEducation(req.body)
    const result = await requireDatabase().query('insert into educations (id_resume, degree, school, city, start_date, end_date, description) select id_resume, $1, $2, $3, $4, $5, $6 from resumes where id_resume = $7 and id_user = $8 returning id_education, id_resume, degree, school, city, start_date, end_date, description, created_at, updated_at', [education.degree, education.school, education.city, education.startDate, education.endDate, education.description, req.params.id, req.auth.sub])
    if (!result.rows[0]) throw new ApiError(404, 'CV introuvable.')
    return res.status(201).json({ education: result.rows[0] })
  } catch (error) { return next(error) }
}

export async function updateEducation(req, res, next) {
  try {
    validateIds(req.params.id, req.params.educationId)
    const education = validateEducation(req.body)
    const result = await requireDatabase().query('update educations as education set degree = $1, school = $2, city = $3, start_date = $4, end_date = $5, description = $6 from resumes where education.id_education = $7 and education.id_resume = $8 and resumes.id_resume = education.id_resume and resumes.id_user = $9 returning education.id_education, education.id_resume, education.degree, education.school, education.city, education.start_date, education.end_date, education.description, education.created_at, education.updated_at', [education.degree, education.school, education.city, education.startDate, education.endDate, education.description, req.params.educationId, req.params.id, req.auth.sub])
    if (!result.rows[0]) throw new ApiError(404, 'Formation introuvable.')
    return res.json({ education: result.rows[0] })
  } catch (error) { return next(error) }
}

export async function deleteEducation(req, res, next) {
  try {
    validateIds(req.params.id, req.params.educationId)
    const result = await requireDatabase().query('delete from educations as education using resumes where education.id_education = $1 and education.id_resume = $2 and resumes.id_resume = education.id_resume and resumes.id_user = $3 returning education.id_education', [req.params.educationId, req.params.id, req.auth.sub])
    if (!result.rows[0]) throw new ApiError(404, 'Formation introuvable.')
    return res.status(204).send()
  } catch (error) { return next(error) }
}
