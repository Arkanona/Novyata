import { requireDatabase } from '../config/database.js'
import ApiError from '../utils/ApiError.js'

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const sectionKeys = ['name', 'job_title', 'summary', 'experiences', 'educations', 'skills', 'languages', 'custom_sections']
const defaults = Object.freeze({ name: false, job_title: false, summary: false, experiences: false, educations: false, skills: false, languages: false, custom_sections: false })
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function validateProfile(body) {
  const slug = typeof body?.slug === 'string' ? body.slug.trim().toLowerCase() : ''
  if (slug.length < 3 || slug.length > 60 || !slugPattern.test(slug)) throw new ApiError(400, 'Le lien doit contenir 3 à 60 caractères : lettres minuscules, chiffres et tirets.')
  const resumeId = body?.id_resume || null
  if (resumeId && !uuid.test(resumeId)) throw new ApiError(400, 'Sélection de CV invalide.')
  const source = body?.visible_sections
  if (!source || typeof source !== 'object' || Array.isArray(source) || Object.keys(source).some((key) => !sectionKeys.includes(key)) || sectionKeys.some((key) => typeof source[key] !== 'boolean')) throw new ApiError(400, 'Les options de visibilité sont invalides.')
  return { slug, resumeId, visibleSections: Object.fromEntries(sectionKeys.map((key) => [key, source[key]])), isPublished: body?.is_published === true }
}

export async function getMyPortfolio(req, res, next) {
  try {
    const result = await requireDatabase().query('select slug, id_resume, is_published, visible_sections, created_at, updated_at from public_profiles where id_user=$1', [req.auth.sub])
    return res.json({ profile: result.rows[0] || null, defaults })
  } catch (error) { return next(error) }
}

export async function saveMyPortfolio(req, res, next) {
  try {
    const data = validateProfile(req.body)
    const database = requireDatabase()
    if (data.resumeId) {
      const owned = await database.query('select 1 from resumes where id_resume=$1 and id_user=$2', [data.resumeId, req.auth.sub])
      if (!owned.rows[0]) throw new ApiError(404, 'CV introuvable.')
    }
    const result = await database.query(
      `insert into public_profiles (id_user,id_resume,slug,is_published,visible_sections)
       values ($1,$2,$3,$4,$5::jsonb)
       on conflict (id_user) do update set id_resume=excluded.id_resume, slug=excluded.slug, is_published=excluded.is_published, visible_sections=excluded.visible_sections, updated_at=now()
       returning slug,id_resume,is_published,visible_sections,created_at,updated_at`,
      [req.auth.sub, data.resumeId, data.slug, data.isPublished, JSON.stringify(data.visibleSections)],
    )
    return res.json({ profile: result.rows[0] })
  } catch (error) {
    if (error?.code === '23505') return next(new ApiError(409, 'Ce lien est déjà utilisé. Choisissez un autre nom.'))
    return next(error)
  }
}

export async function getPublicPortfolio(req, res, next) {
  try {
    const slug = String(req.params.slug || '').toLowerCase()
    if (slug.length > 60 || !slugPattern.test(slug)) throw new ApiError(404, 'Portfolio introuvable.')
    const database = requireDatabase()
    const profile = (await database.query(
      `select pp.visible_sections, r.id_resume, r.first_name, r.last_name, r.job_title, r.summary
       from public_profiles pp join resumes r on r.id_resume=pp.id_resume
       where pp.slug=$1 and pp.is_published=true`, [slug],
    )).rows[0]
    if (!profile) throw new ApiError(404, 'Portfolio introuvable.')
    const visible = profile.visible_sections || defaults
    const portfolio = { name: visible.name ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') : null, jobTitle: visible.job_title ? profile.job_title : null, summary: visible.summary ? profile.summary : null, experiences: [], educations: [], skills: [], languages: [], customSections: [] }
    if (visible.experiences) portfolio.experiences = (await database.query('select job_title,company,start_date,end_date,is_current,description from experiences where id_resume=$1 order by start_date desc nulls last,created_at desc', [profile.id_resume])).rows
    if (visible.educations) portfolio.educations = (await database.query('select degree,school,start_date,end_date,description from educations where id_resume=$1 order by start_date desc nulls last,created_at desc', [profile.id_resume])).rows
    if (visible.skills) portfolio.skills = (await database.query('select name,level from skills where id_resume=$1 order by created_at,name', [profile.id_resume])).rows
    if (visible.languages) portfolio.languages = (await database.query('select name,level from languages where id_resume=$1 order by created_at,name', [profile.id_resume])).rows
    if (visible.custom_sections) portfolio.customSections = (await database.query('select section_type,title,content,display_order from resume_custom_sections where id_resume=$1 order by display_order,created_at', [profile.id_resume])).rows
    return res.json({ portfolio })
  } catch (error) { return next(error) }
}
