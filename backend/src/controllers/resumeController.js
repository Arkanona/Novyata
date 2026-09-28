import { requireDatabase } from '../config/database.js'
import ApiError from '../utils/ApiError.js'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function validateResume(body) {
  const errors = {}
  const titleResume = body.title_resume?.trim()
  const firstName = body.first_name?.trim()
  const lastName = body.last_name?.trim()
  const jobTitle = body.job_title?.trim()

  if (!titleResume || titleResume.length < 2) errors.title_resume = 'Le titre du CV doit contenir au moins 2 caractères.'
  if (!firstName || firstName.length < 2) errors.first_name = 'Le prénom doit contenir au moins 2 caractères.'
  if (!lastName || lastName.length < 2) errors.last_name = 'Le nom doit contenir au moins 2 caractères.'
  if (!jobTitle || jobTitle.length < 2) errors.job_title = 'Le poste recherché doit contenir au moins 2 caractères.'
  if (Object.keys(errors).length) throw new ApiError(400, 'Certaines informations sont invalides.', errors)

  return { titleResume, firstName, lastName, jobTitle }
}

function validateResumeUpdate(body) {
  const errors = {}
  const firstName = body.first_name?.trim()
  const lastName = body.last_name?.trim()
  const jobTitle = body.job_title?.trim()
  const email = body.email?.trim().toLowerCase() || null
  const phone = body.phone?.trim() || null
  const city = body.city?.trim() || null
  const summary = body.summary?.trim() || null
  const templateKey = ['classic', 'modern', 'minimal'].includes(body.template_key) ? body.template_key : 'classic'
  const accentColor = ['#314A67', '#4C627A', '#3F6B5B', '#7A4B4B', '#5B5F97', '#374151'].includes(body.accent_color) ? body.accent_color : '#314A67'
  const fontSize = ['small', 'normal', 'large'].includes(body.font_size) ? body.font_size : 'normal'

  if (!firstName || firstName.length < 2) errors.first_name = 'Le prénom doit contenir au moins 2 caractères.'
  if (!lastName || lastName.length < 2) errors.last_name = 'Le nom doit contenir au moins 2 caractères.'
  if (!jobTitle || jobTitle.length < 2) errors.job_title = 'Le poste recherché doit contenir au moins 2 caractères.'
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Adresse e-mail invalide.'
  if (phone && phone.length > 32) errors.phone = 'Le téléphone ne peut pas dépasser 32 caractères.'
  if (city && city.length > 160) errors.city = 'La ville ne peut pas dépasser 160 caractères.'
  if (summary && summary.length > 2000) errors.summary = 'La présentation ne peut pas dépasser 2000 caractères.'
  if (Object.keys(errors).length) throw new ApiError(400, 'Certaines informations sont invalides.', errors)

  return { firstName, lastName, jobTitle, email, phone, city, summary, templateKey, accentColor, fontSize }
}

function serializeResume(resume) {
  return {
    id_resume: resume.id_resume,
    title_resume: resume.title_resume,
    job_title: resume.job_title,
    first_name: resume.first_name,
    last_name: resume.last_name,
    email: resume.email,
    phone: resume.phone,
    city: resume.city,
    summary: resume.summary,
    template_key: resume.template_key,
    accent_color: resume.accent_color,
    font_size: resume.font_size,
    created_at: resume.created_at,
    updated_at: resume.updated_at,
    ...(resume.experiences ? { experiences: resume.experiences } : {}),
    ...(resume.educations ? { educations: resume.educations } : {}),
    ...(resume.skills ? { skills: resume.skills } : {}),
    ...(resume.languages ? { languages: resume.languages } : {}),
  }
}

export async function listResumes(req, res, next) {
  try {
    const database = requireDatabase()
    const result = await database.query(
      'select id_resume, title_resume, job_title, first_name, last_name, email, phone, city, summary, template_key, accent_color, font_size, created_at, updated_at from resumes where id_user = $1 order by updated_at desc',
      [req.auth.sub],
    )
    return res.json({ resumes: result.rows.map(serializeResume) })
  } catch (error) {
    return next(error)
  }
}

export async function createResume(req, res, next) {
  try {
    const { titleResume, firstName, lastName, jobTitle } = validateResume(req.body)
    const database = requireDatabase()
    const result = await database.query(
      'insert into resumes (id_user, title_resume, first_name, last_name, job_title) values ($1, $2, $3, $4, $5) returning id_resume, title_resume, job_title, first_name, last_name, email, phone, city, summary, created_at, updated_at',
      [req.auth.sub, titleResume, firstName, lastName, jobTitle],
    )
    return res.status(201).json({ resume: serializeResume(result.rows[0]) })
  } catch (error) {
    return next(error)
  }
}

export async function getResume(req, res, next) {
  try {
    if (!uuidPattern.test(req.params.id)) throw new ApiError(400, 'Identifiant de CV invalide.')
    const database = requireDatabase()
    const result = await database.query(
      'select id_resume, title_resume, job_title, first_name, last_name, email, phone, city, summary, template_key, accent_color, font_size, created_at, updated_at from resumes where id_resume = $1 and id_user = $2',
      [req.params.id, req.auth.sub],
    )
    if (!result.rows[0]) throw new ApiError(404, 'CV introuvable.')
    const [experiences, educations, skills, languages] = await Promise.all([
      database.query('select id_experience, id_resume, job_title, company, city, start_date, end_date, is_current, description, created_at, updated_at from experiences where id_resume = $1 order by start_date desc nulls last, created_at desc', [req.params.id]),
      database.query('select id_education, id_resume, degree, school, city, start_date, end_date, description, created_at, updated_at from educations where id_resume = $1 order by start_date desc nulls last, created_at desc', [req.params.id]),
      database.query('select id_skill, id_resume, name, level, created_at, updated_at from skills where id_resume = $1 order by created_at desc', [req.params.id]),
      database.query('select id_language, id_resume, name, level, created_at, updated_at from languages where id_resume = $1 order by created_at desc', [req.params.id]),
    ])
    return res.json({ resume: serializeResume({ ...result.rows[0], experiences: experiences.rows, educations: educations.rows, skills: skills.rows, languages: languages.rows }) })
  } catch (error) {
    return next(error)
  }
}

export async function updateResume(req, res, next) {
  try {
    if (!uuidPattern.test(req.params.id)) throw new ApiError(400, 'Identifiant de CV invalide.')
    const { firstName, lastName, jobTitle, email, phone, city, summary, templateKey, accentColor, fontSize } = validateResumeUpdate(req.body)
    const result = await requireDatabase().query(
      'update resumes set first_name = $1, last_name = $2, job_title = $3, email = $4, phone = $5, city = $6, summary = $7, template_key = $8, accent_color = $9, font_size = $10 where id_resume = $11 and id_user = $12 returning id_resume, title_resume, job_title, first_name, last_name, email, phone, city, summary, template_key, accent_color, font_size, created_at, updated_at',
      [firstName, lastName, jobTitle, email, phone, city, summary, templateKey, accentColor, fontSize, req.params.id, req.auth.sub],
    )
    if (!result.rows[0]) throw new ApiError(404, 'CV introuvable.')
    return res.json({ resume: serializeResume(result.rows[0]) })
  } catch (error) {
    return next(error)
  }
}

export async function deleteResume(req, res, next) {
  try {
    if (!uuidPattern.test(req.params.id)) throw new ApiError(400, 'Identifiant de CV invalide.')
    const result = await requireDatabase().query(
      'delete from resumes where id_resume = $1 and id_user = $2 returning id_resume',
      [req.params.id, req.auth.sub],
    )
    if (!result.rows[0]) throw new ApiError(404, 'CV introuvable.')
    return res.status(204).send()
  } catch (error) {
    return next(error)
  }
}
