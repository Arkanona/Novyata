import { requireDatabase } from '../config/database.js'
import { planLimit } from '../config/plans.js'
import { parseResumeMultipart } from '../services/resumeImportService.js'
import ApiError from '../utils/ApiError.js'

const languageLevels = ['Débutant', 'Intermédiaire', 'Courant', 'Bilingue', 'Langue maternelle']
const datePattern = /^\d{4}-\d{2}-\d{2}$/

function text(value, max, field, required = false) {
  if (typeof value !== 'string') value = ''
  const result = value.trim().slice(0, max)
  if (required && result.length < 2) throw new ApiError(400, `${field} doit contenir au moins 2 caractères.`)
  return result || null
}

function date(value, label) {
  const result = text(value, 10, label)
  if (result) {
    if (!datePattern.test(result)) throw new ApiError(400, `${label} invalide.`)
    const parts = result.split('-').map(Number)
    const parsed = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]))
    if (parsed.toISOString().slice(0, 10) !== result) throw new ApiError(400, `${label} invalide.`)
  }
  return result
}

function list(value, name, maxCount = 12) {
  if (value === undefined) return []
  if (!Array.isArray(value) || value.length > maxCount) throw new ApiError(400, `La liste ${name} est invalide.`)
  return value
}

function reviewPayload(body) {
  const title = text(body.title_resume, 120, 'Le titre du CV', true)
  const firstName = text(body.first_name, 80, 'Le prénom', true)
  const lastName = text(body.last_name, 100, 'Le nom', true)
  const jobTitle = text(body.job_title, 160, 'Le poste recherché', true)
  const email = text(body.email, 254, 'L’adresse e-mail')
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, 'L’adresse e-mail est invalide.')
  const experiences = list(body.experiences, 'des expériences').map((item) => {
    const startDate = date(item?.start_date, 'La date de début')
    if (item?.is_current !== undefined && typeof item.is_current !== 'boolean') throw new ApiError(400, 'Le statut du poste actuel est invalide.')
    const isCurrent = item?.is_current === true
    const endDate = isCurrent ? null : date(item?.end_date, 'La date de fin')
    if (startDate && endDate && startDate > endDate) throw new ApiError(400, 'La date de fin doit être postérieure à la date de début.')
    return { job_title: text(item?.job_title, 160, 'Le poste', true), company: text(item?.company, 160, 'L’entreprise', true), city: text(item?.city, 160, 'La ville'), start_date: startDate, end_date: endDate, is_current: isCurrent, description: text(item?.description, 2000, 'La description') }
  })
  const educations = list(body.educations, 'des formations').map((item) => {
    const startDate = date(item?.start_date, 'La date de début')
    const endDate = date(item?.end_date, 'La date de fin')
    if (startDate && endDate && startDate > endDate) throw new ApiError(400, 'La date de fin doit être postérieure à la date de début.')
    return { degree: text(item?.degree, 180, 'Le diplôme', true), school: text(item?.school, 180, 'L’établissement', true), city: text(item?.city, 160, 'La ville'), start_date: startDate, end_date: endDate, description: text(item?.description, 2000, 'La description') }
  })
  const skills = list(body.skills, 'des compétences', 30).map((item) => ({ name: text(item?.name, 100, 'La compétence', true), level: text(item?.level, 40, 'Le niveau') }))
  const languages = list(body.languages, 'des langues', 30).map((item) => {
    const name = text(item?.name, 100, 'La langue', true)
    const level = text(item?.level, 40, 'Le niveau de langue', true)
    if (!languageLevels.includes(level)) throw new ApiError(400, `Sélectionnez un niveau valide pour la langue « ${name} ».`)
    return { name, level }
  })
  return {
    title_resume: title,
    first_name: firstName,
    last_name: lastName,
    job_title: jobTitle,
    email,
    phone: text(body.phone, 32, 'Le téléphone'),
    city: text(body.city, 160, 'La ville'),
    summary: text(body.summary, 2000, 'Le profil'),
    experiences,
    educations,
    skills,
    languages,
  }
}

export async function parseResumeImport(req, res, next) {
  try {
    const parsed = await parseResumeMultipart(req)
    return res.json({ import: parsed })
  } catch (error) { return next(error) }
}

export async function createResumeFromImport(req, res, next) {
  let client
  try {
    const data = reviewPayload(req.body || {})
    const database = requireDatabase()
    client = await database.connect()
    await client.query('begin')
    await client.query("select set_config('novyata.skip_resume_version_capture', 'on', true)")
    const account = (await client.query('select plan from users where id_user = $1 for update', [req.auth.sub])).rows[0]
    if (!account) throw new ApiError(401, 'Utilisateur introuvable.')
    const monthlyLimit = planLimit(account.plan, 'resumeImportsPerMonth')
    const period = new Date().toISOString().slice(0, 7)
    const usage = await client.query(
      'insert into resume_import_usage (id_user, period, import_count) values ($1, $2, 1) on conflict (id_user, period) do update set import_count = resume_import_usage.import_count + 1, updated_at = now() where resume_import_usage.import_count < $3 returning import_count',
      [req.auth.sub, period, monthlyLimit],
    )
    if (!usage.rows[0]) throw new ApiError(429, 'Vous avez atteint la limite mensuelle d’imports de CV de votre offre.', { feature: 'resume_import', limit: monthlyLimit, upgrade: account.plan !== 'pro' })
    const inserted = await client.query(
      'insert into resumes (id_user, title_resume, first_name, last_name, job_title, email, phone, city, summary, template_key) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) returning id_resume, parent_resume_id, title_resume, job_title, first_name, last_name, email, phone, city, summary, template_key, accent_color, font_size, font_family, content_density, section_spacing, heading_style, divider_style, section_order, created_at, updated_at',
      [req.auth.sub, data.title_resume, data.first_name, data.last_name, data.job_title, data.email, data.phone, data.city, data.summary, 'classic'],
    )
    const resume = inserted.rows[0]
    for (const item of data.experiences) await client.query('insert into experiences (id_resume, job_title, company, city, start_date, end_date, is_current, description) values ($1, $2, $3, $4, $5, $6, $7, $8)', [resume.id_resume, item.job_title, item.company, item.city, item.start_date, item.end_date, item.is_current, item.description])
    for (const item of data.educations) await client.query('insert into educations (id_resume, degree, school, city, start_date, end_date, description) values ($1, $2, $3, $4, $5, $6, $7)', [resume.id_resume, item.degree, item.school, item.city, item.start_date, item.end_date, item.description])
    for (const item of data.skills) await client.query('insert into skills (id_resume, name, level) values ($1, $2, $3)', [resume.id_resume, item.name, item.level])
    for (const item of data.languages) await client.query('insert into languages (id_resume, name, level) values ($1, $2, $3)', [resume.id_resume, item.name, item.level])
    await client.query("select capture_resume_version($1, $2, 'CV importé')", [resume.id_resume, req.auth.sub])
    await client.query('commit')
    return res.status(201).json({ resume: { ...resume, experiences: data.experiences, educations: data.educations, skills: data.skills, languages: data.languages } })
  } catch (error) {
    if (client) await client.query('rollback').catch(() => {})
    return next(error)
  } finally {
    client?.release()
  }
}
