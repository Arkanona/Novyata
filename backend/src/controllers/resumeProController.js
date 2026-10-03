import { requireDatabase } from '../config/database.js'
import ApiError from '../utils/ApiError.js'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const sectionTypes = new Set(['projects', 'certifications', 'volunteering', 'achievements', 'publications', 'portfolio', 'github', 'linkedin', 'interests'])
const sectionOrderKeys = new Set(['summary', 'experiences', 'educations', 'skills', 'languages'])
const sectionLabels = { projects: 'Projets', certifications: 'Certifications', volunteering: 'Bénévolat', achievements: 'Réalisations', publications: 'Publications', portfolio: 'Portfolio', github: 'GitHub', linkedin: 'LinkedIn', interests: 'Centres d’intérêt' }

function validResumeId(id) {
  if (!uuid.test(id || '')) throw new ApiError(400, 'Identifiant de CV invalide.')
}

async function ownedProResume(database, resumeId, userId) {
  const result = await database.query('select resumes.id_resume, users.plan from resumes join users on users.id_user = resumes.id_user where resumes.id_resume = $1 and resumes.id_user = $2', [resumeId, userId])
  const row = result.rows[0]
  if (!row) throw new ApiError(404, 'CV introuvable.')
  if (row.plan !== 'pro') throw new ApiError(403, 'Cette fonctionnalité est disponible avec Novyata Pro.', { upgrade: true })
  return row
}

function validateSection(body = {}) {
  const errors = {}
  const type = typeof body.section_type === 'string' ? body.section_type : ''
  const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim() : sectionLabels[type]
  const content = typeof body.content === 'string' ? body.content.trim() : ''
  const displayOrder = Number.isInteger(body.display_order) && body.display_order >= 0 ? body.display_order : 0
  if (!sectionTypes.has(type)) errors.section_type = 'Choisissez un type de section disponible.'
  if (!title || title.length > 120) errors.title = 'Le titre est obligatoire et limité à 120 caractères.'
  if (!content || content.length > 5000) errors.content = 'Le contenu est obligatoire et limité à 5 000 caractères.'
  if (Object.keys(errors).length) throw new ApiError(400, 'Certaines informations sont invalides.', errors)
  return { type, title, content, displayOrder }
}

export async function createCustomSection(req, res, next) {
  try {
    validResumeId(req.params.id)
    const section = validateSection(req.body)
    const database = requireDatabase()
    await ownedProResume(database, req.params.id, req.auth.sub)
    const result = await database.query('insert into resume_custom_sections (id_resume, section_type, title, content, display_order) values ($1,$2,$3,$4,$5) returning id_resume_section,id_resume,section_type,title,content,display_order,created_at,updated_at', [req.params.id, section.type, section.title, section.content, section.displayOrder])
    return res.status(201).json({ section: result.rows[0] })
  } catch (error) { return next(error) }
}

export async function updateCustomSection(req, res, next) {
  try {
    validResumeId(req.params.id)
    if (!uuid.test(req.params.sectionId || '')) throw new ApiError(400, 'Identifiant de section invalide.')
    const section = validateSection(req.body)
    const database = requireDatabase()
    await ownedProResume(database, req.params.id, req.auth.sub)
    const result = await database.query('update resume_custom_sections as section set section_type=$1,title=$2,content=$3,display_order=$4 from resumes where section.id_resume_section=$5 and section.id_resume=$6 and resumes.id_resume=section.id_resume and resumes.id_user=$7 returning section.id_resume_section,section.id_resume,section.section_type,section.title,section.content,section.display_order,section.created_at,section.updated_at', [section.type, section.title, section.content, section.displayOrder, req.params.sectionId, req.params.id, req.auth.sub])
    if (!result.rows[0]) throw new ApiError(404, 'Section introuvable.')
    return res.json({ section: result.rows[0] })
  } catch (error) { return next(error) }
}

export async function deleteCustomSection(req, res, next) {
  try {
    validResumeId(req.params.id)
    if (!uuid.test(req.params.sectionId || '')) throw new ApiError(400, 'Identifiant de section invalide.')
    const database = requireDatabase()
    await ownedProResume(database, req.params.id, req.auth.sub)
    const result = await database.query('delete from resume_custom_sections as section using resumes where section.id_resume_section=$1 and section.id_resume=$2 and resumes.id_resume=section.id_resume and resumes.id_user=$3 returning section.id_resume_section', [req.params.sectionId, req.params.id, req.auth.sub])
    if (!result.rows[0]) throw new ApiError(404, 'Section introuvable.')
    return res.status(204).send()
  } catch (error) { return next(error) }
}

export async function reorderResumeSections(req, res, next) {
  try {
    validResumeId(req.params.id)
    const order = req.body?.section_order
    if (!Array.isArray(order) || order.length > 20 || new Set(order).size !== order.length || order.some((key) => typeof key !== 'string' || (!sectionOrderKeys.has(key) && !/^custom:[0-9a-f-]{36}$/i.test(key)))) throw new ApiError(400, 'L’ordre des sections est invalide.')
    const database = requireDatabase()
    await ownedProResume(database, req.params.id, req.auth.sub)
    const customIds = order.filter((key) => key.startsWith('custom:')).map((key) => key.slice(7))
    if (customIds.length) {
      const ownedSections = await database.query('select id_resume_section from resume_custom_sections where id_resume=$1 and id_resume_section=any($2::uuid[])', [req.params.id, customIds])
      if (ownedSections.rowCount !== customIds.length) throw new ApiError(400, 'L’ordre contient une section qui n’appartient pas à ce CV.')
    }
    const result = await database.query('update resumes set section_order=$1::jsonb where id_resume=$2 and id_user=$3 returning section_order', [JSON.stringify(order), req.params.id, req.auth.sub])
    if (!result.rows[0]) throw new ApiError(404, 'CV introuvable.')
    return res.json({ section_order: result.rows[0].section_order })
  } catch (error) { return next(error) }
}

export async function createResumeVariant(req, res, next) {
  let client
  try {
    validResumeId(req.params.id)
    const title = typeof req.body?.title_resume === 'string' ? req.body.title_resume.trim() : ''
    if (!title || title.length < 2 || title.length > 160) throw new ApiError(400, 'Le titre de la variante doit contenir de 2 à 160 caractères.')
    const database = requireDatabase()
    const sourceResult = await database.query('select resumes.id_resume,users.plan from resumes join users on users.id_user=resumes.id_user where resumes.id_resume=$1 and resumes.id_user=$2', [req.params.id, req.auth.sub])
    const source = sourceResult.rows[0]
    if (!source) throw new ApiError(404, 'CV introuvable.')
    if (source.plan !== 'pro') throw new ApiError(403, 'Les variantes de CV sont disponibles avec Novyata Pro.', { upgrade: true, feature: 'resumeVariants' })

    client = await database.connect()
    await client.query('begin')
    await client.query("select set_config('novyata.skip_resume_version_capture', 'on', true)")
    const copied = await client.query('insert into resumes (id_user,parent_resume_id,title_resume,job_title,first_name,last_name,email,phone,city,summary,template_key,accent_color,font_size,font_family,content_density,section_spacing,heading_style,divider_style,section_order) select id_user,coalesce(parent_resume_id,id_resume),$1,job_title,first_name,last_name,email,phone,city,summary,template_key,accent_color,font_size,font_family,content_density,section_spacing,heading_style,divider_style,section_order from resumes where id_resume=$2 and id_user=$3 returning id_resume,parent_resume_id,title_resume,job_title,first_name,last_name,email,phone,city,summary,template_key,accent_color,font_size,font_family,content_density,section_spacing,heading_style,divider_style,section_order,created_at,updated_at', [title, req.params.id, req.auth.sub])
    const variant = copied.rows[0]
    if (!variant) throw new ApiError(404, 'CV introuvable.')
    const copies = [
      ['experiences', 'id_experience,job_title,company,city,start_date,end_date,is_current,description', 'job_title,company,city,start_date,end_date,is_current,description'],
      ['educations', 'id_education,degree,school,city,start_date,end_date,description', 'degree,school,city,start_date,end_date,description'],
      ['skills', 'id_skill,name,level', 'name,level'],
      ['languages', 'id_language,name,level', 'name,level'],
      ['resume_custom_sections', 'id_resume_section,section_type,title,content,display_order', 'section_type,title,content,display_order'],
    ]
    for (const [table, , fields] of copies) await client.query(`insert into ${table} (id_resume,${fields}) select $1,${fields} from ${table} where id_resume=$2`, [variant.id_resume, req.params.id])
    await client.query("select capture_resume_version($1, $2, 'Variante créée')", [variant.id_resume, req.auth.sub])
    await client.query('commit')
    return res.status(201).json({ resume: variant })
  } catch (error) {
    if (client) await client.query('rollback').catch(() => {})
    return next(error)
  } finally { client?.release() }
}
