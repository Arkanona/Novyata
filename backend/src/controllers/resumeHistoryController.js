import { requireDatabase } from '../config/database.js'
import ApiError from '../utils/ApiError.js'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const resumeColumns = 'id_resume, parent_resume_id, title_resume, job_title, first_name, last_name, email, phone, city, summary, template_key, accent_color, font_size, font_family, content_density, section_spacing, heading_style, divider_style, section_order, created_at, updated_at'
const arrays = (snapshot) => ({ experiences: snapshot?.experiences || [], educations: snapshot?.educations || [], skills: snapshot?.skills || [], languages: snapshot?.languages || [], custom_sections: snapshot?.custom_sections || [] })

async function getOwnedResume(database, resumeId, userId) {
  const result = await database.query(`select resumes.${resumeColumns.replaceAll(', ', ', resumes.')} , users.plan from resumes join users on users.id_user=resumes.id_user where resumes.id_resume=$1 and resumes.id_user=$2`, [resumeId, userId])
  const resume = result.rows[0]
  if (!resume) throw new ApiError(404, 'CV introuvable.')
  if (resume.plan !== 'pro') throw new ApiError(403, 'L’historique et la comparaison des CV sont disponibles avec Novyata Pro.', { upgrade: true, feature: 'fullHistory' })
  return resume
}

export async function listResumeVersions(req, res, next) {
  try {
    if (!uuid.test(req.params.id)) throw new ApiError(400, 'Identifiant de CV invalide.')
    const database = requireDatabase()
    await getOwnedResume(database, req.params.id, req.auth.sub)
    await database.query("select capture_resume_version($1, $2, 'État actuel')", [req.params.id, req.auth.sub])
    const result = await database.query('select id_resume_version, version_label, reason, snapshot, created_at from resume_versions where id_resume=$1 and id_user=$2 order by created_at desc, id_resume_version desc', [req.params.id, req.auth.sub])
    return res.json({ versions: result.rows })
  } catch (error) { return next(error) }
}

function validateTitle(value) {
  const title = typeof value === 'string' ? value.trim() : ''
  if (title.length < 2 || title.length > 160) throw new ApiError(400, 'Le titre doit contenir de 2 à 160 caractères.')
  return title
}

async function createFromVersion({ database, source, version, userId, title, reason }) {
  const snapshot = version.snapshot
  const details = arrays(snapshot)
  const client = await database.connect()
  try {
    await client.query('begin')
    await client.query("select set_config('novyata.skip_resume_version_capture', 'on', true)")
    const inserted = await client.query(
      `insert into resumes (id_user,parent_resume_id,title_resume,job_title,first_name,last_name,email,phone,city,summary,template_key,accent_color,font_size,font_family,content_density,section_spacing,heading_style,divider_style,section_order)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19::jsonb) returning ${resumeColumns}`,
      [userId, source.parent_resume_id || source.id_resume, title, snapshot.resume.job_title, snapshot.resume.first_name, snapshot.resume.last_name, snapshot.resume.email, snapshot.resume.phone, snapshot.resume.city, snapshot.resume.summary, snapshot.resume.template_key, snapshot.resume.accent_color, snapshot.resume.font_size, snapshot.resume.font_family, snapshot.resume.content_density, snapshot.resume.section_spacing, snapshot.resume.heading_style, snapshot.resume.divider_style, JSON.stringify(snapshot.resume.section_order || [])],
    )
    const resume = inserted.rows[0]
    if (!resume) throw new ApiError(404, 'La version demandée est introuvable.')
    for (const item of details.experiences) await client.query('insert into experiences(id_resume,job_title,company,city,start_date,end_date,is_current,description) values($1,$2,$3,$4,$5,$6,$7,$8)', [resume.id_resume, item.job_title, item.company, item.city, item.start_date, item.end_date, item.is_current, item.description])
    for (const item of details.educations) await client.query('insert into educations(id_resume,degree,school,city,start_date,end_date,description) values($1,$2,$3,$4,$5,$6,$7)', [resume.id_resume, item.degree, item.school, item.city, item.start_date, item.end_date, item.description])
    for (const item of details.skills) await client.query('insert into skills(id_resume,name,level) values($1,$2,$3)', [resume.id_resume, item.name, item.level])
    for (const item of details.languages) await client.query('insert into languages(id_resume,name,level) values($1,$2,$3)', [resume.id_resume, item.name, item.level])
    for (const item of details.custom_sections) await client.query('insert into resume_custom_sections(id_resume,section_type,title,content,display_order) values($1,$2,$3,$4,$5)', [resume.id_resume, item.section_type, item.title, item.content, item.display_order])
    await client.query('select capture_resume_version($1,$2,$3)', [resume.id_resume, userId, reason])
    await client.query('commit')
    return resume
  } catch (error) { await client.query('rollback').catch(() => {}); throw error } finally { client.release() }
}

async function copyVersion(req, res, next, mode) {
  try {
    if (!uuid.test(req.params.id) || !uuid.test(req.params.versionId)) throw new ApiError(400, 'Identifiant de version invalide.')
    const database = requireDatabase()
    const source = await getOwnedResume(database, req.params.id, req.auth.sub)
    const found = await database.query('select id_resume_version, snapshot from resume_versions where id_resume_version=$1 and id_resume=$2 and id_user=$3', [req.params.versionId, req.params.id, req.auth.sub])
    const version = found.rows[0]
    if (!version) throw new ApiError(404, 'Version introuvable.')
    if (!version.snapshot?.resume) throw new ApiError(409, 'Le contenu de cette version est illisible.')
    const duplicateTitle = typeof req.body?.title_resume === 'string' ? req.body.title_resume : `${source.title_resume} — Copie`
    const title = mode === 'restore' ? validateTitle(`${source.title_resume} — Restauré`.slice(0, 160)) : validateTitle(duplicateTitle)
    const resume = await createFromVersion({ database, source, version, userId: req.auth.sub, title, reason: mode === 'restore' ? `Restauration de ${version.id_resume_version}` : `Copie de ${version.id_resume_version}` })
    return res.status(201).json({ resume, source_version_id: version.id_resume_version })
  } catch (error) { return next(error) }
}

export const restoreResumeVersion = (req, res, next) => copyVersion(req, res, next, 'restore')
export const duplicateResumeVersion = (req, res, next) => copyVersion(req, res, next, 'duplicate')

function diffItems(leftItems, rightItems, keyOf) {
  const remaining = [...rightItems]
  const added = []
  const removed = []
  const modified = []
  for (const before of leftItems) {
    const index = remaining.findIndex((after) => keyOf(before) === keyOf(after))
    if (index < 0) { removed.push(before); continue }
    const [after] = remaining.splice(index, 1)
    if (JSON.stringify(before) !== JSON.stringify(after)) modified.push({ before, after })
  }
  added.push(...remaining)
  return { added, removed, modified }
}

const sameValue = (left, right) => JSON.stringify(left ?? null) === JSON.stringify(right ?? null)
export function compareResumeSnapshots(left, right) {
  const a = left.resume || {}; const b = right.resume || {}
  const scalar = (field) => sameValue(a[field], b[field]) ? null : { before: a[field] ?? null, after: b[field] ?? null }
  const leftSkills = left.skills || []; const rightSkills = right.skills || []
  return {
    summary: scalar('summary'),
    experiences: diffItems(left.experiences || [], right.experiences || [], (item) => [item.job_title, item.company, item.start_date].map((part) => (part || '').toLocaleLowerCase()).join('|')),
    educations: diffItems(left.educations || [], right.educations || [], (item) => [item.degree, item.school, item.start_date].map((part) => (part || '').toLocaleLowerCase()).join('|')),
    skills: diffItems(leftSkills, rightSkills, (item) => (item.name || '').toLocaleLowerCase()),
    languages: diffItems(left.languages || [], right.languages || [], (item) => (item.name || '').toLocaleLowerCase()),
    customSections: diffItems(left.custom_sections || [], right.custom_sections || [], (item) => `${item.section_type}|${item.title}`.toLocaleLowerCase()),
    sectionOrder: scalar('section_order'),
    appearance: Object.fromEntries(['template_key', 'accent_color', 'font_size', 'font_family', 'content_density', 'section_spacing', 'heading_style', 'divider_style'].map((field) => [field, scalar(field)]).filter(([, value]) => value)),
  }
}

export async function compareResumes(req, res, next) {
  try {
    const leftId = req.body?.leftResumeId; const rightId = req.body?.rightResumeId
    if (!uuid.test(leftId || '') || !uuid.test(rightId || '') || leftId === rightId) throw new ApiError(400, 'Sélectionnez deux CV différents.')
    const database = requireDatabase()
    const result = await database.query('select r.id_resume,r.title_resume,r.job_title,build_resume_snapshot(r.id_resume) as snapshot from resumes r join users u on u.id_user=r.id_user where r.id_resume=any($1::uuid[]) and r.id_user=$2 and u.plan=$3', [[leftId, rightId], req.auth.sub, 'pro'])
    if (result.rows.length !== 2) {
      const owned = await database.query('select 1 from resumes where id_resume=any($1::uuid[]) and id_user=$2', [[leftId, rightId], req.auth.sub])
      if (owned.rows.length === 2) throw new ApiError(403, 'La comparaison est disponible avec Novyata Pro.', { upgrade: true, feature: 'fullHistory' })
      throw new ApiError(404, 'Un des CV sélectionnés est introuvable.')
    }
    const [left, right] = [result.rows.find((item) => item.id_resume === leftId), result.rows.find((item) => item.id_resume === rightId)]
    return res.json({ left: { id_resume: left.id_resume, title_resume: left.title_resume, job_title: left.job_title }, right: { id_resume: right.id_resume, title_resume: right.title_resume, job_title: right.job_title }, diff: compareResumeSnapshots(left.snapshot, right.snapshot) })
  } catch (error) { return next(error) }
}
