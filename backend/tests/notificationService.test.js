import { describe, expect, it, vi } from 'vitest'
import { INTERVIEW_NOTIFICATION_HOURS, NO_RESPONSE_NOTIFICATION_DAYS } from '../src/config/applications.js'
import { refreshUserNotifications } from '../src/services/notificationService.js'

const userId = '8b74e3e1-64b4-46f1-bfd8-c50a174cf908'

describe('notificationService', () => {
  it('uses the centralized 24-hour and 8-day rules and persists deduplicated, application-linked notifications', async () => {
    const now = new Date('2026-10-02T10:00:00.000Z')
    const database = { query: vi.fn()
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [{ id_interview: 'interview-1', interview_date: '2026-10-03T08:00:00.000Z', id_application: 'application-1', company_name: 'CloudNova', job_title: 'Designer' }] })
      .mockResolvedValueOnce({ rows: [{ id_application: 'application-2', company_name: 'DataBridge', job_title: 'Analyste', reminder_anchor: '2026-09-20T00:00:00.000Z' }] })
      .mockResolvedValue({ rows: [] }) }

    await refreshUserNotifications(database, userId, now)

    expect(INTERVIEW_NOTIFICATION_HOURS).toBe(24)
    expect(NO_RESPONSE_NOTIFICATION_DAYS).toBe(8)
    expect(database.query.mock.calls[0][0]).toContain("n.scheduled_for = coalesce(sent.last_sent_at, a.application_date::timestamptz) + make_interval(days => $2)")
    expect(database.query.mock.calls[0][0]).toContain("a.status in ('Archivée', 'Refusée')")
    expect(database.query.mock.calls[1][0]).toContain("i.interview_date <= $3")
    expect(database.query.mock.calls[1][1]).toEqual([userId, now, new Date('2026-10-03T10:00:00.000Z')])
    expect(database.query.mock.calls[2][0]).toContain('make_interval(days => $3)')
    expect(database.query.mock.calls[2][1]).toEqual([userId, now, 8])
    const interviewInsert = database.query.mock.calls[3]
    expect(interviewInsert[0]).toContain("'interview_soon'")
    expect(interviewInsert[0]).toContain('on conflict (id_user, dedupe_key) do update')
    expect(interviewInsert[1]).toEqual([userId, 'application-1', expect.stringContaining('CloudNova'), 'interview:interview-1', new Date('2026-10-03T08:00:00.000Z')])
    const followupInsert = database.query.mock.calls[4]
    expect(followupInsert[0]).toContain("'no_response'")
    expect(followupInsert[0]).toContain('on conflict (id_user, dedupe_key) do nothing')
    expect(followupInsert[1][0]).toBe(userId)
    expect(followupInsert[1][1]).toBe('application-2')
    expect(followupInsert[1][2]).toContain('8 jours')
  })

  it('queries data by authenticated user and excludes archived or rejected applications from interview reminders', async () => {
    const database = { query: vi.fn().mockResolvedValue({ rows: [] }) }
    await refreshUserNotifications(database, userId)
    expect(database.query.mock.calls.every(([, params]) => params[0] === userId)).toBe(true)
    expect(database.query.mock.calls[0][0]).toContain("a.status in ('Archivée', 'Refusée')")
    expect(database.query.mock.calls[1][0]).toContain("a.status not in ('Archivée', 'Refusée')")
    expect(database.query.mock.calls[2][0]).toContain("a.status in ('Candidature envoyée', 'En cours d’étude')")
  })
})
