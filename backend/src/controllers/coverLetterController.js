import { requireDatabase } from '../config/database.js'
import ApiError from '../utils/ApiError.js'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const templates = ['classic', 'modern']

function optionalText(value) {
  return typeof value === 'string' ? value.trim() || null : null
}

function validateLetter(body) {
  const errors = {}
  const title = optionalText(body.title)
  const companyName = optionalText(body.company_name)
  const jobTitle = optionalText(body.job_title)
  const recipientName = optionalText(body.recipient_name)
  const recipientPosition = optionalText(body.recipient_position)
  const companyAddress = optionalText(body.company_address)
  const subject = optionalText(body.subject)
  const content = optionalText(body.content)
  const idResume = optionalText(body.id_resume)
  const template = templates.includes(body.template) ? body.template : 'classic'

  if (!title || title.length < 2) errors.title = 'Le titre doit contenir au moins 2 caractères.'
  if (!content || content.length < 20) errors.content = 'Le contenu doit contenir au moins 20 caractères.'
  if (title && title.length > 160) errors.title = 'Le titre ne peut pas dépasser 160 caractères.'
  if (companyName && companyName.length > 160) errors.company_name = 'Le nom de l’entreprise ne peut pas dépasser 160 caractères.'
  if (jobTitle && jobTitle.length > 160) errors.job_title = 'Le poste visé ne peut pas dépasser 160 caractères.'
  if (content && content.length > 12000) errors.content = 'Le contenu ne peut pas dépasser 12 000 caractères.'
  if (idResume && !uuidPattern.test(idResume)) errors.id_resume = 'Le CV sélectionné est invalide.'
  if (Object.keys(errors).length) throw new ApiError(400, 'Certaines informations sont invalides.', errors)

  return { title, companyName, jobTitle, recipientName, recipientPosition, companyAddress, subject, content, idResume, template }
}

function serializeLetter(letter) {
  return {
    id_cover_letter: letter.id_cover_letter,
    id_resume: letter.id_resume,
    title: letter.title,
    company_name: letter.company_name,
    job_title: letter.job_title,
    recipient_name: letter.recipient_name,
    recipient_position: letter.recipient_position,
    company_address: letter.company_address,
    subject: letter.subject,
    content: letter.content,
    template: letter.template,
    created_at: letter.created_at,
    updated_at: letter.updated_at,
  }
}

async function ensureResumeOwnership(database, resumeId, userId) {
  if (!resumeId) return
  const result = await database.query('select id_resume from resumes where id_resume = $1 and id_user = $2', [resumeId, userId])
  if (!result.rows[0]) throw new ApiError(404, 'CV introuvable.')
}

export async function listCoverLetters(req, res, next) {
  try {
    const result = await requireDatabase().query(
      'select id_cover_letter, id_resume, title, company_name, job_title, recipient_name, recipient_position, company_address, subject, content, template, created_at, updated_at from cover_letters where id_user = $1 order by updated_at desc',
      [req.auth.sub],
    )
    return res.json({ cover_letters: result.rows.map(serializeLetter) })
  } catch (error) { return next(error) }
}

export async function createCoverLetter(req, res, next) {
  try {
    const letter = validateLetter(req.body)
    const database = requireDatabase()
    await ensureResumeOwnership(database, letter.idResume, req.auth.sub)
    const result = await database.query(
      'insert into cover_letters (id_user, id_resume, title, company_name, job_title, recipient_name, recipient_position, company_address, subject, content, template) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) returning id_cover_letter, id_resume, title, company_name, job_title, recipient_name, recipient_position, company_address, subject, content, template, created_at, updated_at',
      [req.auth.sub, letter.idResume, letter.title, letter.companyName, letter.jobTitle, letter.recipientName, letter.recipientPosition, letter.companyAddress, letter.subject, letter.content, letter.template],
    )
    return res.status(201).json({ cover_letter: serializeLetter(result.rows[0]) })
  } catch (error) { return next(error) }
}

export async function getCoverLetter(req, res, next) {
  try {
    if (!uuidPattern.test(req.params.id)) throw new ApiError(400, 'Identifiant de lettre invalide.')
    const result = await requireDatabase().query(
      'select id_cover_letter, id_resume, title, company_name, job_title, recipient_name, recipient_position, company_address, subject, content, template, created_at, updated_at from cover_letters where id_cover_letter = $1 and id_user = $2',
      [req.params.id, req.auth.sub],
    )
    if (!result.rows[0]) throw new ApiError(404, 'Lettre introuvable.')
    return res.json({ cover_letter: serializeLetter(result.rows[0]) })
  } catch (error) { return next(error) }
}

export async function updateCoverLetter(req, res, next) {
  try {
    if (!uuidPattern.test(req.params.id)) throw new ApiError(400, 'Identifiant de lettre invalide.')
    const letter = validateLetter(req.body)
    const database = requireDatabase()
    await ensureResumeOwnership(database, letter.idResume, req.auth.sub)
    const result = await database.query(
      'update cover_letters set id_resume = $1, title = $2, company_name = $3, job_title = $4, recipient_name = $5, recipient_position = $6, company_address = $7, subject = $8, content = $9, template = $10 where id_cover_letter = $11 and id_user = $12 returning id_cover_letter, id_resume, title, company_name, job_title, recipient_name, recipient_position, company_address, subject, content, template, created_at, updated_at',
      [letter.idResume, letter.title, letter.companyName, letter.jobTitle, letter.recipientName, letter.recipientPosition, letter.companyAddress, letter.subject, letter.content, letter.template, req.params.id, req.auth.sub],
    )
    if (!result.rows[0]) throw new ApiError(404, 'Lettre introuvable.')
    return res.json({ cover_letter: serializeLetter(result.rows[0]) })
  } catch (error) { return next(error) }
}

export async function deleteCoverLetter(req, res, next) {
  try {
    if (!uuidPattern.test(req.params.id)) throw new ApiError(400, 'Identifiant de lettre invalide.')
    const result = await requireDatabase().query('delete from cover_letters where id_cover_letter = $1 and id_user = $2 returning id_cover_letter', [req.params.id, req.auth.sub])
    if (!result.rows[0]) throw new ApiError(404, 'Lettre introuvable.')
    return res.status(204).send()
  } catch (error) { return next(error) }
}
