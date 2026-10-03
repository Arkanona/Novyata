import { randomUUID } from 'node:crypto'
import { requireDatabase } from '../config/database.js'
import { refreshUserNotifications } from '../services/notificationService.js'
import ApiError from '../utils/ApiError.js'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const fields = 'id_notification, id_application, type, title, body, is_read, scheduled_for, created_at, updated_at'

function validateId(id) {
  if (!uuid.test(id)) throw new ApiError(400, 'Identifiant de notification invalide.')
}

export async function listNotifications(req, res, next) {
  try {
    const database = requireDatabase()
    await refreshUserNotifications(database, req.auth.sub)
    const [notifications, unread] = await Promise.all([
      database.query(`select ${fields} from notifications where id_user = $1 and archived_at is null order by is_read asc, scheduled_for desc, created_at desc limit 100`, [req.auth.sub]),
      database.query('select count(*)::int as count from notifications where id_user = $1 and archived_at is null and is_read = false', [req.auth.sub]),
    ])
    return res.json({ notifications: notifications.rows, unreadCount: unread.rows[0]?.count || 0 })
  } catch (error) { return next(error) }
}

export async function createNextActionNotification(req, res, next) {
  try {
    const idApplication = typeof req.body?.id_application === 'string' ? req.body.id_application : ''
    validateId(idApplication)
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : ''
    const body = typeof req.body?.body === 'string' ? req.body.body.trim() : ''
    const scheduledFor = typeof req.body?.scheduled_for === 'string' ? new Date(req.body.scheduled_for) : null
    const now = Date.now()
    if (title.length < 2 || title.length > 160) throw new ApiError(400, 'Le titre du rappel doit contenir entre 2 et 160 caractères.')
    if (body.length > 500) throw new ApiError(400, 'Le détail du rappel ne peut pas dépasser 500 caractères.')
    if (!scheduledFor || Number.isNaN(scheduledFor.getTime()) || scheduledFor.getTime() <= now || scheduledFor.getTime() > now + 366 * 86_400_000) throw new ApiError(400, 'Choisissez une date future dans l’année à venir.')
    const database = requireDatabase()
    const application = await database.query('select id_application from applications where id_application = $1 and id_user = $2', [idApplication, req.auth.sub])
    if (!application.rows[0]) throw new ApiError(404, 'Candidature introuvable.')
    const result = await database.query(
      `insert into notifications (id_user, id_application, type, title, body, dedupe_key, scheduled_for)
       values ($1, $2, 'next_action', $3, $4, $5, $6)
       returning ${fields}`,
      [req.auth.sub, idApplication, title, body || title, `next_action:${randomUUID()}`, scheduledFor],
    )
    return res.status(201).json({ notification: result.rows[0] })
  } catch (error) { return next(error) }
}

export async function setNotificationRead(req, res, next) {
  try {
    validateId(req.params.id)
    if (typeof req.body?.is_read !== 'boolean') throw new ApiError(400, 'Le statut de lecture doit être un booléen.')
    const result = await requireDatabase().query(
      `update notifications set is_read = $1 where id_notification = $2 and id_user = $3 and archived_at is null returning ${fields}`,
      [req.body.is_read, req.params.id, req.auth.sub],
    )
    if (!result.rows[0]) throw new ApiError(404, 'Notification introuvable.')
    return res.json({ notification: result.rows[0] })
  } catch (error) { return next(error) }
}

export async function archiveNotification(req, res, next) {
  try {
    validateId(req.params.id)
    const result = await requireDatabase().query(
      `update notifications set archived_at = now(), is_read = true where id_notification = $1 and id_user = $2 and archived_at is null returning ${fields}`,
      [req.params.id, req.auth.sub],
    )
    if (!result.rows[0]) throw new ApiError(404, 'Notification introuvable.')
    return res.json({ notification: result.rows[0] })
  } catch (error) { return next(error) }
}

export async function archiveAllNotifications(req, res, next) {
  try {
    const result = await requireDatabase().query(
      'update notifications set archived_at = now(), is_read = true where id_user = $1 and archived_at is null returning id_notification',
      [req.auth.sub],
    )
    return res.json({ archivedCount: result.rowCount || 0 })
  } catch (error) { return next(error) }
}

export async function markAllNotificationsRead(req, res, next) {
  try {
    const result = await requireDatabase().query(
      'update notifications set is_read = true where id_user = $1 and archived_at is null and is_read = false returning id_notification',
      [req.auth.sub],
    )
    return res.json({ updatedCount: result.rowCount || 0 })
  } catch (error) { return next(error) }
}

export async function deleteNotification(req, res, next) {
  try {
    validateId(req.params.id)
    const result = await requireDatabase().query('delete from notifications where id_notification = $1 and id_user = $2 returning id_notification', [req.params.id, req.auth.sub])
    if (!result.rows[0]) throw new ApiError(404, 'Notification introuvable.')
    return res.status(204).send()
  } catch (error) { return next(error) }
}
