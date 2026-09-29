import { requireDatabase } from '../config/database.js'
import ApiError from '../utils/ApiError.js'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const datePattern = /^\d{4}-\d{2}-\d{2}$/
export const applicationStatuses = ['À postuler', 'Candidature envoyée', 'En cours d’étude', 'Entretien', 'Proposition', 'Refusée', 'Archivée']

function optionalText(value) { return typeof value === 'string' ? value.trim() || null : null }

function validateApplication(body) {
  const errors = {}
  const companyName = optionalText(body.company_name)
  const jobTitle = optionalText(body.job_title)
  const location = optionalText(body.location)
  const jobUrl = optionalText(body.job_url)
  const salary = optionalText(body.salary)
  const status = applicationStatuses.includes(body.status) ? body.status : 'À postuler'
  const applicationDate = optionalText(body.application_date)
  const contactName = optionalText(body.contact_name)
  const contactEmail = optionalText(body.contact_email)?.toLowerCase() || null
  const notes = optionalText(body.notes)
  const idResume = optionalText(body.id_resume)
  const idCoverLetter = optionalText(body.id_cover_letter)

  if (!companyName || companyName.length < 2) errors.company_name = 'L’entreprise doit contenir au moins 2 caractères.'
  if (!jobTitle || jobTitle.length < 2) errors.job_title = 'Le poste doit contenir au moins 2 caractères.'
  if (applicationDate && !datePattern.test(applicationDate)) errors.application_date = 'La date de candidature est invalide.'
  if (jobUrl && !/^https?:\/\/\S+$/i.test(jobUrl)) errors.job_url = 'Le lien de l’offre doit commencer par http:// ou https://.'
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) errors.contact_email = 'L’e-mail du contact est invalide.'
  if (idResume && !uuidPattern.test(idResume)) errors.id_resume = 'Le CV sélectionné est invalide.'
  if (idCoverLetter && !uuidPattern.test(idCoverLetter)) errors.id_cover_letter = 'La lettre sélectionnée est invalide.'
  if (notes && notes.length > 8000) errors.notes = 'Les notes ne peuvent pas dépasser 8 000 caractères.'
  if (Object.keys(errors).length) throw new ApiError(400, 'Certaines informations sont invalides.', errors)

  return { companyName, jobTitle, location, jobUrl, salary, status, applicationDate, contactName, contactEmail, notes, idResume, idCoverLetter }
}

function serializeApplication(application) {
  const applicationDate = application.application_date instanceof Date
    ? application.application_date.toISOString().slice(0, 10)
    : application.application_date
  return {
    id_application: application.id_application,
    id_resume: application.id_resume,
    id_cover_letter: application.id_cover_letter,
    company_name: application.company_name,
    job_title: application.job_title,
    location: application.location,
    job_url: application.job_url,
    salary: application.salary,
    status: application.status,
    application_date: applicationDate,
    contact_name: application.contact_name,
    contact_email: application.contact_email,
    notes: application.notes,
    created_at: application.created_at,
    updated_at: application.updated_at,
  }
}

async function ensureLinkedResourcesOwnership(database, application, userId) {
  if (application.idResume) {
    const resume = await database.query('select id_resume from resumes where id_resume = $1 and id_user = $2', [application.idResume, userId])
    if (!resume.rows[0]) throw new ApiError(404, 'CV introuvable.')
  }
  if (application.idCoverLetter) {
    const letter = await database.query('select id_cover_letter from cover_letters where id_cover_letter = $1 and id_user = $2', [application.idCoverLetter, userId])
    if (!letter.rows[0]) throw new ApiError(404, 'Lettre introuvable.')
  }
}

const fields = 'id_application, id_resume, id_cover_letter, company_name, job_title, location, job_url, salary, status, application_date, contact_name, contact_email, notes, created_at, updated_at'

export async function listApplications(req, res, next) {
  try {
    const result = await requireDatabase().query(`select ${fields} from applications where id_user = $1 order by application_date desc nulls last, updated_at desc`, [req.auth.sub])
    return res.json({ applications: result.rows.map(serializeApplication) })
  } catch (error) { return next(error) }
}

export async function createApplication(req, res, next) {
  try {
    const application = validateApplication(req.body)
    const database = requireDatabase()
    await ensureLinkedResourcesOwnership(database, application, req.auth.sub)
    const result = await database.query(
      `insert into applications (id_user, id_resume, id_cover_letter, company_name, job_title, location, job_url, salary, status, application_date, contact_name, contact_email, notes) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) returning ${fields}`,
      [req.auth.sub, application.idResume, application.idCoverLetter, application.companyName, application.jobTitle, application.location, application.jobUrl, application.salary, application.status, application.applicationDate, application.contactName, application.contactEmail, application.notes],
    )
    return res.status(201).json({ application: serializeApplication(result.rows[0]) })
  } catch (error) { return next(error) }
}

export async function getApplication(req, res, next) {
  try {
    if (!uuidPattern.test(req.params.id)) throw new ApiError(400, 'Identifiant de candidature invalide.')
    const result = await requireDatabase().query(`select ${fields} from applications where id_application = $1 and id_user = $2`, [req.params.id, req.auth.sub])
    if (!result.rows[0]) throw new ApiError(404, 'Candidature introuvable.')
    return res.json({ application: serializeApplication(result.rows[0]) })
  } catch (error) { return next(error) }
}

export async function updateApplication(req, res, next) {
  try {
    if (!uuidPattern.test(req.params.id)) throw new ApiError(400, 'Identifiant de candidature invalide.')
    const application = validateApplication(req.body)
    const database = requireDatabase()
    await ensureLinkedResourcesOwnership(database, application, req.auth.sub)
    const result = await database.query(
      `update applications set id_resume = $1, id_cover_letter = $2, company_name = $3, job_title = $4, location = $5, job_url = $6, salary = $7, status = $8, application_date = $9, contact_name = $10, contact_email = $11, notes = $12 where id_application = $13 and id_user = $14 returning ${fields}`,
      [application.idResume, application.idCoverLetter, application.companyName, application.jobTitle, application.location, application.jobUrl, application.salary, application.status, application.applicationDate, application.contactName, application.contactEmail, application.notes, req.params.id, req.auth.sub],
    )
    if (!result.rows[0]) throw new ApiError(404, 'Candidature introuvable.')
    return res.json({ application: serializeApplication(result.rows[0]) })
  } catch (error) { return next(error) }
}

export async function deleteApplication(req, res, next) {
  try {
    if (!uuidPattern.test(req.params.id)) throw new ApiError(400, 'Identifiant de candidature invalide.')
    const result = await requireDatabase().query('delete from applications where id_application = $1 and id_user = $2 returning id_application', [req.params.id, req.auth.sub])
    if (!result.rows[0]) throw new ApiError(404, 'Candidature introuvable.')
    return res.status(204).send()
  } catch (error) { return next(error) }
}
