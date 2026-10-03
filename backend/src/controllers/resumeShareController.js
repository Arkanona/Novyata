import { createHash, randomBytes } from 'node:crypto'
import { requireDatabase } from '../config/database.js'
import { planLimit } from '../config/plans.js'
import ApiError from '../utils/ApiError.js'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const tokenHash = (token) => createHash('sha256').update(token).digest('hex')
const expiryDays = new Set([7, 30, 90])

export async function listResumeShareLinks(req, res, next) {
  try {
    if (!uuid.test(req.params.id || '')) throw new ApiError(400, 'Identifiant de CV invalide.')
    const database = requireDatabase()
    const resume = await database.query('select 1 from resumes where id_resume=$1 and id_user=$2', [req.params.id, req.auth.sub])
    if (!resume.rows[0]) throw new ApiError(404, 'CV introuvable.')
    const result = await database.query('select id_resume_share_link,include_contact_details,expires_at,revoked_at,created_at from resume_share_links where id_resume=$1 and id_user=$2 order by created_at desc', [req.params.id, req.auth.sub])
    return res.json({ links: result.rows })
  } catch (error) { return next(error) }
}

export async function createResumeShareLink(req, res, next) {
  try {
    if (!uuid.test(req.params.id || '')) throw new ApiError(400, 'Identifiant de CV invalide.')
    const days = req.body?.expiresInDays === null || req.body?.expiresInDays === undefined || req.body?.expiresInDays === '' ? null : Number(req.body.expiresInDays)
    if (days !== null && (!Number.isInteger(days) || !expiryDays.has(days))) throw new ApiError(400, 'Choisissez une expiration de 7, 30 ou 90 jours, ou sans expiration.')
    if (req.body?.includeContactDetails !== undefined && typeof req.body.includeContactDetails !== 'boolean') throw new ApiError(400, 'Le choix des coordonnées est invalide.')
    const database = requireDatabase()
    const owner = (await database.query('select users.plan from resumes join users on users.id_user=resumes.id_user where resumes.id_resume=$1 and resumes.id_user=$2', [req.params.id, req.auth.sub])).rows[0]
    if (!owner) throw new ApiError(404, 'CV introuvable.')
    const count = (await database.query('select count(*)::int as count from resume_share_links where id_user=$1 and revoked_at is null and (expires_at is null or expires_at > now())', [req.auth.sub])).rows[0]?.count || 0
    const limit = planLimit(owner.plan, 'resumeShareLinks')
    if (count >= limit) throw new ApiError(403, 'Vous avez atteint le nombre de liens actifs inclus dans votre forfait.', { upgrade: owner.plan !== 'pro', feature: 'resumeShareLinks', limit })
    const token = randomBytes(32).toString('base64url')
    const hash = tokenHash(token)
    const expiresAt = days === null ? null : new Date(Date.now() + days * 86_400_000)
    const result = await database.query('insert into resume_share_links (id_user,id_resume,token_hash,include_contact_details,expires_at) values($1,$2,$3,$4,$5) returning id_resume_share_link,include_contact_details,expires_at,revoked_at,created_at', [req.auth.sub, req.params.id, hash, req.body?.includeContactDetails === true, expiresAt])
    return res.status(201).json({ link: { ...result.rows[0], path: `/cv/share/${token}` } })
  } catch (error) { return next(error) }
}

export async function revokeResumeShareLink(req, res, next) {
  try {
    if (!uuid.test(req.params.id || '') || !uuid.test(req.params.linkId || '')) throw new ApiError(400, 'Identifiant de lien invalide.')
    const result = await requireDatabase().query('update resume_share_links set revoked_at=now() where id_resume_share_link=$1 and id_resume=$2 and id_user=$3 and revoked_at is null returning id_resume_share_link,revoked_at', [req.params.linkId, req.params.id, req.auth.sub])
    if (!result.rows[0]) throw new ApiError(404, 'Lien de partage introuvable.')
    return res.json({ link: result.rows[0] })
  } catch (error) { return next(error) }
}

export async function getSharedResume(req, res, next) {
  try {
    const token = String(req.params.token || '')
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new ApiError(404, 'CV partagé introuvable ou indisponible.')
    const database = requireDatabase()
    const result = await database.query(
      `select r.title_resume,r.job_title,r.first_name,r.last_name,r.email,r.phone,r.city,r.summary,r.template_key,r.accent_color,r.font_size,r.font_family,r.content_density,r.section_spacing,r.heading_style,r.divider_style,r.section_order,l.include_contact_details
       from resume_share_links l join resumes r on r.id_resume=l.id_resume
       where l.token_hash=$1 and l.revoked_at is null and (l.expires_at is null or l.expires_at > now())`, [tokenHash(token)],
    )
    const resume = result.rows[0]
    if (!resume) throw new ApiError(404, 'CV partagé introuvable ou indisponible.')
    const [experienceResult, educationResult, skills, languages, customSections] = await Promise.all([
      database.query('select job_title,company,city,start_date,end_date,is_current,description from experiences where id_resume=(select id_resume from resume_share_links where token_hash=$1)', [tokenHash(token)]),
      database.query('select degree,school,city,start_date,end_date,description from educations where id_resume=(select id_resume from resume_share_links where token_hash=$1)', [tokenHash(token)]),
      database.query('select name,level from skills where id_resume=(select id_resume from resume_share_links where token_hash=$1)', [tokenHash(token)]),
      database.query('select name,level from languages where id_resume=(select id_resume from resume_share_links where token_hash=$1)', [tokenHash(token)]),
      database.query('select section_type,title,content,display_order from resume_custom_sections where id_resume=(select id_resume from resume_share_links where token_hash=$1) order by display_order', [tokenHash(token)]),
    ])
    const sanitizeLocation = (items) => items.rows.map(({ city, ...item }) => includeContact ? { ...item, city } : item)
    const { include_contact_details: includeContact, ...publicResume } = resume
    if (!includeContact) { delete publicResume.email; delete publicResume.phone; delete publicResume.city }
    return res.json({ resume: { ...publicResume, experiences: sanitizeLocation(experienceResult), educations: sanitizeLocation(educationResult), skills: skills.rows, languages: languages.rows, custom_sections: customSections.rows } })
  } catch (error) { return next(error) }
}
