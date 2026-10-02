import { requireDatabase } from '../config/database.js'
import ApiError from '../utils/ApiError.js'
import { canUseResumeTemplate, FREE_ACCENT_COLORS, PRO_ACCENT_COLORS, RESUME_TEMPLATE_ACCESS } from '../config/plans.js'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const defaultSectionOrder = ['summary', 'experiences', 'educations', 'skills', 'languages']
const orderedSections = new Set(defaultSectionOrder)

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
  const templateKey = body.template_key || 'classic'
  if (!RESUME_TEMPLATE_ACCESS[templateKey]) errors.template_key = 'Sélectionnez un modèle de CV disponible.'
  if (Object.keys(errors).length) throw new ApiError(400, 'Certaines informations sont invalides.', errors)
  return { titleResume, firstName, lastName, jobTitle, templateKey }
}

async function assertResumeCapabilities(database, userId, templateKey, advancedAppearance = false) {
  if (RESUME_TEMPLATE_ACCESS[templateKey] !== 'pro' && !advancedAppearance) return
  const result = await database.query('select plan from users where id_user = $1', [userId])
  if (!result.rows[0]) throw new ApiError(401, 'Utilisateur introuvable.')
  const plan = result.rows[0].plan
  if (!canUseResumeTemplate(plan, templateKey)) throw new ApiError(403, 'Ce modèle est disponible avec Novyata Pro.', { upgrade: true, template: templateKey })
  if (advancedAppearance && plan !== 'pro') throw new ApiError(403, 'La personnalisation avancée est disponible avec Novyata Pro.', { upgrade: true, feature: 'advancedCustomization' })
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
  const templateKey = body.template_key || 'classic'
  const accentColor = [...FREE_ACCENT_COLORS, ...PRO_ACCENT_COLORS].includes(body.accent_color) ? body.accent_color : '#314A67'
  const fontSize = ['small', 'normal', 'large'].includes(body.font_size) ? body.font_size : 'normal'
  const fontFamily = ['Inter', 'Arial', 'Georgia', 'DM Serif Display'].includes(body.font_family) ? body.font_family : 'Inter'
  const contentDensity = ['compact', 'normal', 'airy'].includes(body.content_density) ? body.content_density : 'normal'
  const sectionSpacing = ['compact', 'normal', 'airy'].includes(body.section_spacing) ? body.section_spacing : 'normal'
  const headingStyle = ['line', 'plain', 'filled'].includes(body.heading_style) ? body.heading_style : 'line'
  const dividerStyle = ['solid', 'dashed', 'dotted'].includes(body.divider_style) ? body.divider_style : 'solid'
  const sectionOrder = Array.isArray(body.section_order) ? body.section_order : defaultSectionOrder

  if (!firstName || firstName.length < 2) errors.first_name = 'Le prénom doit contenir au moins 2 caractères.'
  if (!lastName || lastName.length < 2) errors.last_name = 'Le nom doit contenir au moins 2 caractères.'
  if (!jobTitle || jobTitle.length < 2) errors.job_title = 'Le poste recherché doit contenir au moins 2 caractères.'
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Adresse e-mail invalide.'
  if (phone && phone.length > 32) errors.phone = 'Le téléphone ne peut pas dépasser 32 caractères.'
  if (city && city.length > 160) errors.city = 'La ville ne peut pas dépasser 160 caractères.'
  if (summary && summary.length > 2000) errors.summary = 'La présentation ne peut pas dépasser 2000 caractères.'
  if (!RESUME_TEMPLATE_ACCESS[templateKey]) errors.template_key = 'Sélectionnez un modèle de CV disponible.'
  if (sectionOrder.length > 20 || new Set(sectionOrder).size !== sectionOrder.length || sectionOrder.some((key) => typeof key !== 'string' || (!orderedSections.has(key) && !/^custom:[0-9a-f-]{36}$/i.test(key)))) errors.section_order = 'L’ordre des sections est invalide.'
  if (Object.keys(errors).length) throw new ApiError(400, 'Certaines informations sont invalides.', errors)

  const advancedAppearance = !FREE_ACCENT_COLORS.includes(accentColor) || fontFamily !== 'Inter' || contentDensity !== 'normal' || sectionSpacing !== 'normal' || headingStyle !== 'line' || dividerStyle !== 'solid' || JSON.stringify(sectionOrder) !== JSON.stringify(defaultSectionOrder)
  return { firstName, lastName, jobTitle, email, phone, city, summary, templateKey, accentColor, fontSize, fontFamily, contentDensity, sectionSpacing, headingStyle, dividerStyle, sectionOrder, advancedAppearance }
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
    parent_resume_id: resume.parent_resume_id || null,
    section_order: resume.section_order || defaultSectionOrder,
    font_family: resume.font_family || 'Inter',
    content_density: resume.content_density || 'normal',
    section_spacing: resume.section_spacing || 'normal',
    heading_style: resume.heading_style || 'line',
    divider_style: resume.divider_style || 'solid',
    created_at: resume.created_at,
    updated_at: resume.updated_at,
    ...(resume.experiences ? { experiences: resume.experiences } : {}),
    ...(resume.educations ? { educations: resume.educations } : {}),
    ...(resume.skills ? { skills: resume.skills } : {}),
    ...(resume.languages ? { languages: resume.languages } : {}),
    ...(resume.custom_sections ? { custom_sections: resume.custom_sections } : {}),
    ...(resume.variants ? { variants: resume.variants } : {}),
  }
}

export async function listResumes(req, res, next) {
  try {
    const database = requireDatabase()
    const result = await database.query(
      'select id_resume, parent_resume_id, title_resume, job_title, first_name, last_name, email, phone, city, summary, template_key, accent_color, font_size, font_family, content_density, section_spacing, heading_style, divider_style, section_order, created_at, updated_at from resumes where id_user = $1 order by updated_at desc',
      [req.auth.sub],
    )
    return res.json({ resumes: result.rows.map(serializeResume) })
  } catch (error) {
    return next(error)
  }
}

export async function createResume(req, res, next) {
  try {
    const { titleResume, firstName, lastName, jobTitle, templateKey } = validateResume(req.body)
    const database = requireDatabase()
    await assertResumeCapabilities(database, req.auth.sub, templateKey)
    const result = await database.query(
      'insert into resumes (id_user, title_resume, first_name, last_name, job_title, template_key) values ($1, $2, $3, $4, $5, $6) returning id_resume, parent_resume_id, title_resume, job_title, first_name, last_name, email, phone, city, summary, template_key, accent_color, font_size, font_family, content_density, section_spacing, heading_style, divider_style, section_order, created_at, updated_at',
      [req.auth.sub, titleResume, firstName, lastName, jobTitle, templateKey],
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
      'select id_resume, parent_resume_id, title_resume, job_title, first_name, last_name, email, phone, city, summary, template_key, accent_color, font_size, font_family, content_density, section_spacing, heading_style, divider_style, section_order, created_at, updated_at from resumes where id_resume = $1 and id_user = $2',
      [req.params.id, req.auth.sub],
    )
    if (!result.rows[0]) throw new ApiError(404, 'CV introuvable.')
    const [experiences, educations, skills, languages, customSections, variants] = await Promise.all([
      database.query('select id_experience, id_resume, job_title, company, city, start_date, end_date, is_current, description, created_at, updated_at from experiences where id_resume = $1 order by start_date desc nulls last, created_at desc', [req.params.id]),
      database.query('select id_education, id_resume, degree, school, city, start_date, end_date, description, created_at, updated_at from educations where id_resume = $1 order by start_date desc nulls last, created_at desc', [req.params.id]),
      database.query('select id_skill, id_resume, name, level, created_at, updated_at from skills where id_resume = $1 order by created_at desc', [req.params.id]),
      database.query('select id_language, id_resume, name, level, created_at, updated_at from languages where id_resume = $1 order by created_at desc', [req.params.id]),
      database.query('select id_resume_section, id_resume, section_type, title, content, display_order, created_at, updated_at from resume_custom_sections where id_resume = $1 order by display_order, created_at', [req.params.id]),
      database.query('select id_resume, title_resume, job_title, template_key, updated_at from resumes where parent_resume_id = $1 and id_user = $2 order by updated_at desc', [result.rows[0].parent_resume_id || req.params.id, req.auth.sub]),
    ])
    return res.json({ resume: serializeResume({ ...result.rows[0], experiences: experiences.rows, educations: educations.rows, skills: skills.rows, languages: languages.rows, custom_sections: customSections.rows, variants: variants.rows }) })
  } catch (error) {
    return next(error)
  }
}

export async function updateResume(req, res, next) {
  try {
    if (!uuidPattern.test(req.params.id)) throw new ApiError(400, 'Identifiant de CV invalide.')
    const { firstName, lastName, jobTitle, email, phone, city, summary, templateKey, accentColor, fontSize, fontFamily, contentDensity, sectionSpacing, headingStyle, dividerStyle, sectionOrder, advancedAppearance } = validateResumeUpdate(req.body)
    const database = requireDatabase()
    await assertResumeCapabilities(database, req.auth.sub, templateKey, advancedAppearance)
    const result = await database.query(
      'update resumes set first_name = $1, last_name = $2, job_title = $3, email = $4, phone = $5, city = $6, summary = $7, template_key = $8, accent_color = $9, font_size = $10, font_family = $11, content_density = $12, section_spacing = $13, heading_style = $14, divider_style = $15, section_order = $16::jsonb where id_resume = $17 and id_user = $18 returning id_resume, parent_resume_id, title_resume, job_title, first_name, last_name, email, phone, city, summary, template_key, accent_color, font_size, font_family, content_density, section_spacing, heading_style, divider_style, section_order, created_at, updated_at',
      [firstName, lastName, jobTitle, email, phone, city, summary, templateKey, accentColor, fontSize, fontFamily, contentDensity, sectionSpacing, headingStyle, dividerStyle, JSON.stringify(sectionOrder), req.params.id, req.auth.sub],
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
