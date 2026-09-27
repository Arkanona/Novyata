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
    created_at: resume.created_at,
    updated_at: resume.updated_at,
  }
}

export async function listResumes(req, res, next) {
  try {
    const result = await requireDatabase().query(
      'select id_resume, title_resume, job_title, first_name, last_name, email, phone, city, summary, created_at, updated_at from resumes where id_user = $1 order by updated_at desc',
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
    const result = await requireDatabase().query(
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
    const result = await requireDatabase().query(
      'select id_resume, title_resume, job_title, first_name, last_name, email, phone, city, summary, created_at, updated_at from resumes where id_resume = $1 and id_user = $2',
      [req.params.id, req.auth.sub],
    )
    if (!result.rows[0]) throw new ApiError(404, 'CV introuvable.')
    return res.json({ resume: serializeResume(result.rows[0]) })
  } catch (error) {
    return next(error)
  }
}
