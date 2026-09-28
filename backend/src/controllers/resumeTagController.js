import { requireDatabase } from '../config/database.js'
import ApiError from '../utils/ApiError.js'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const skillLevels = ['Débutant', 'Intermédiaire', 'Avancé', 'Expert']
const languageLevels = ['Débutant', 'Intermédiaire', 'Courant', 'Bilingue', 'Langue maternelle']

function valid(resumeId, itemId) { if (!uuid.test(resumeId) || (itemId && !uuid.test(itemId))) throw new ApiError(400, 'Identifiant invalide.') }
function payload(body, levels, requiresLevel) { const name = body.name?.trim(); const level = body.level?.trim() || null; const errors = {}; if (!name || name.length < 2) errors.name = 'Le nom doit contenir au moins 2 caractères.'; if (requiresLevel && !levels.includes(level)) errors.level = 'Niveau invalide.'; if (Object.keys(errors).length) throw new ApiError(400, 'Certaines informations sont invalides.', errors); return { name, level } }

function handlers(kind, singular, levels, requiresLevel) {
  const idColumn = 'id_' + singular
  const resource = singular === 'skill' ? 'Compétence' : 'Langue'
  const create = async (req, res, next) => { try { valid(req.params.id); const data = payload(req.body, levels, requiresLevel); const result = await requireDatabase().query(`insert into ${kind} (id_resume, name, level) select id_resume, $1, $2 from resumes where id_resume = $3 and id_user = $4 returning ${idColumn}, id_resume, name, level, created_at, updated_at`, [data.name, data.level, req.params.id, req.auth.sub]); if (!result.rows[0]) throw new ApiError(404, 'CV introuvable.'); return res.status(201).json({ [singular]: result.rows[0] }) } catch (error) { return next(error) } }
  const update = async (req, res, next) => { try { const itemId = req.params[singular + 'Id']; valid(req.params.id, itemId); const data = payload(req.body, levels, requiresLevel); const result = await requireDatabase().query(`update ${kind} as item set name = $1, level = $2 from resumes where item.${idColumn} = $3 and item.id_resume = $4 and resumes.id_resume = item.id_resume and resumes.id_user = $5 returning item.${idColumn}, item.id_resume, item.name, item.level, item.created_at, item.updated_at`, [data.name, data.level, itemId, req.params.id, req.auth.sub]); if (!result.rows[0]) throw new ApiError(404, `${resource} introuvable.`); return res.json({ [singular]: result.rows[0] }) } catch (error) { return next(error) } }
  const remove = async (req, res, next) => { try { const itemId = req.params[singular + 'Id']; valid(req.params.id, itemId); const result = await requireDatabase().query(`delete from ${kind} as item using resumes where item.${idColumn} = $1 and item.id_resume = $2 and resumes.id_resume = item.id_resume and resumes.id_user = $3 returning item.${idColumn}`, [itemId, req.params.id, req.auth.sub]); if (!result.rows[0]) throw new ApiError(404, `${resource} introuvable.`); return res.status(204).send() } catch (error) { return next(error) } }
  return [create, update, remove]
}

export const [createSkill, updateSkill, deleteSkill] = handlers('skills', 'skill', skillLevels, false)
export const [createLanguage, updateLanguage, deleteLanguage] = handlers('languages', 'language', languageLevels, true)
