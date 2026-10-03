import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createResponse } from './helpers.js'

vi.mock('../src/config/database.js', () => ({ requireDatabase: vi.fn() }))
vi.mock('../src/services/notificationService.js', () => ({ refreshUserNotifications: vi.fn() }))

import { requireDatabase } from '../src/config/database.js'
import { refreshUserNotifications } from '../src/services/notificationService.js'
import { archiveAllNotifications, archiveNotification, createNextActionNotification, deleteNotification, listNotifications, markAllNotificationsRead, setNotificationRead } from '../src/controllers/notificationController.js'

const userId = '8b74e3e1-64b4-46f1-bfd8-c50a174cf908'
const notificationId = '79b551f5-3241-4892-8ae3-563647db6247'

describe('notificationController', () => {
  beforeEach(() => vi.clearAllMocks())

  it('refreshes generated reminders and returns only active user notifications with an unread count', async () => {
    const rows = [{ id_notification: notificationId, id_application: 'application-id', type: 'no_response', title: 'Une relance est possible', is_read: false }]
    const database = { query: vi.fn().mockResolvedValueOnce({ rows }).mockResolvedValueOnce({ rows: [{ count: 1 }] }) }
    requireDatabase.mockReturnValue(database)
    const res = createResponse()
    await listNotifications({ auth: { sub: userId } }, res, vi.fn())
    expect(refreshUserNotifications).toHaveBeenCalledWith(database, userId)
    expect(database.query.mock.calls[0][0]).toContain('where id_user = $1 and archived_at is null')
    expect(database.query.mock.calls[0][1]).toEqual([userId])
    expect(res.json).toHaveBeenCalledWith({ notifications: rows, unreadCount: 1 })
  })

  it('marks a notification read or unread only when owned by the authenticated user', async () => {
    const row = { id_notification: notificationId, is_read: true }
    const database = { query: vi.fn().mockResolvedValue({ rows: [row] }) }
    requireDatabase.mockReturnValue(database)
    const res = createResponse(); const next = vi.fn()
    await setNotificationRead({ params: { id: notificationId }, body: { is_read: true }, auth: { sub: userId } }, res, next)
    expect(database.query.mock.calls[0][0]).toContain('id_notification = $2 and id_user = $3')
    expect(database.query.mock.calls[0][1]).toEqual([true, notificationId, userId])
    expect(res.json).toHaveBeenCalledWith({ notification: row })
    expect(next).not.toHaveBeenCalled()
  })

  it('rejects invalid read states and invalid notification identifiers', async () => {
    const next = vi.fn()
    await setNotificationRead({ params: { id: notificationId }, body: { is_read: 'yes' }, auth: { sub: userId } }, createResponse(), next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 400 })
    expect(requireDatabase).not.toHaveBeenCalled()
    const badId = vi.fn()
    await deleteNotification({ params: { id: 'not-a-uuid' }, auth: { sub: userId } }, createResponse(), badId)
    expect(badId.mock.calls[0][0]).toMatchObject({ statusCode: 400 })
  })

  it('archives one notification, archives all, and deletes only records owned by the user', async () => {
    const database = { query: vi.fn()
      .mockResolvedValueOnce({ rows: [{ id_notification: notificationId, is_read: true }] })
      .mockResolvedValueOnce({ rowCount: 2, rows: [{ id_notification: notificationId }, { id_notification: 'other' }] })
      .mockResolvedValueOnce({ rows: [{ id_notification: notificationId }] }) }
    requireDatabase.mockReturnValue(database)
    const req = { params: { id: notificationId }, auth: { sub: userId } }
    const archiveResponse = createResponse(); await archiveNotification(req, archiveResponse, vi.fn())
    expect(database.query.mock.calls[0][0]).toContain('archived_at = now(), is_read = true')
    const allResponse = createResponse(); await archiveAllNotifications({ auth: { sub: userId } }, allResponse, vi.fn())
    expect(allResponse.json).toHaveBeenCalledWith({ archivedCount: 2 })
    const deleteResponse = createResponse(); await deleteNotification(req, deleteResponse, vi.fn())
    expect(database.query.mock.calls[2][1]).toEqual([notificationId, userId])
    expect(deleteResponse.status).toHaveBeenCalledWith(204)
  })

  it('marks all active unread notifications as read for the current user', async () => {
    const database = { query: vi.fn().mockResolvedValue({ rowCount: 3 }) }
    requireDatabase.mockReturnValue(database)
    const res = createResponse()
    await markAllNotificationsRead({ auth: { sub: userId } }, res, vi.fn())
    expect(database.query.mock.calls[0][0]).toContain('id_user = $1 and archived_at is null and is_read = false')
    expect(res.json).toHaveBeenCalledWith({ updatedCount: 3 })
  })

  it('creates a user-scheduled next-action reminder only for an owned application', async () => {
    const row = { id_notification: notificationId, type: 'next_action', id_application: 'aa8dc2f2-6ff2-43d2-9e4f-5443200f6d4b' }
    const database = { query: vi.fn().mockResolvedValueOnce({ rows: [{ id_application: row.id_application }] }).mockResolvedValueOnce({ rows: [row] }) }
    requireDatabase.mockReturnValue(database)
    const scheduledFor = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    const res = createResponse(); const next = vi.fn()
    await createNextActionNotification({ auth: { sub: userId }, body: { id_application: row.id_application, title: 'Préparer une relance', body: 'Relire mes notes avant de contacter le recruteur.', scheduled_for: scheduledFor } }, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(database.query.mock.calls[0][1]).toEqual([row.id_application, userId])
    expect(database.query.mock.calls[1][0]).toContain("'next_action'")
    expect(database.query.mock.calls[1][1].slice(0, 4)).toEqual([userId, row.id_application, 'Préparer une relance', 'Relire mes notes avant de contacter le recruteur.'])
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith({ notification: row })
  })

  it('rejects invalid scheduled reminders and never inserts for another user’s application', async () => {
    const invalid = vi.fn()
    await createNextActionNotification({ auth: { sub: userId }, body: { id_application: 'aa8dc2f2-6ff2-43d2-9e4f-5443200f6d4b', title: 'Test', scheduled_for: '2020-01-01T00:00:00.000Z' } }, createResponse(), invalid)
    expect(invalid.mock.calls[0][0]).toMatchObject({ statusCode: 400 })
    expect(requireDatabase).not.toHaveBeenCalled()
    const database = { query: vi.fn().mockResolvedValue({ rows: [] }) }
    requireDatabase.mockReturnValue(database)
    const forbidden = vi.fn()
    await createNextActionNotification({ auth: { sub: userId }, body: { id_application: 'aa8dc2f2-6ff2-43d2-9e4f-5443200f6d4b', title: 'Rappel', scheduled_for: new Date(Date.now() + 60000).toISOString() } }, createResponse(), forbidden)
    expect(forbidden.mock.calls[0][0]).toMatchObject({ statusCode: 404 })
    expect(database.query).toHaveBeenCalledOnce()
  })
})
