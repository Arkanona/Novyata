import { describe, expect, it, vi, beforeEach } from 'vitest'
import { createResponse } from './helpers.js'

vi.mock('../src/config/database.js', () => ({ requireDatabase: vi.fn() }))
import { requireDatabase } from '../src/config/database.js'
import { getWeeklyGoal, saveWeeklyGoal } from '../src/controllers/weeklyGoalController.js'

const userId = '8b74e3e1-64b4-46f1-bfd8-c50a174cf908'
const current = { week_start: '2026-09-28', is_enabled: true, target_applications: 5, target_followups: 2, target_interviews: 1, applications_done: 3, followups_done: 1, interviews_done: 0 }
const responsePayload = { goal: { is_enabled: true, target_applications: 5, target_followups: 2, target_interviews: 1 }, week_start: current.week_start, progress: { applications: 3, followups: 1, interviews: 0 } }

describe('weeklyGoalController', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns current targets with actual per-user weekly progress', async () => {
    const database = { query: vi.fn().mockResolvedValue({ rows: [current] }) }
    requireDatabase.mockReturnValue(database)
    const res = createResponse(); const next = vi.fn()
    await getWeeklyGoal({ auth: { sub: userId } }, res, next)
    expect(database.query.mock.calls[0][1]).toEqual([userId])
    expect(res.json).toHaveBeenCalledWith(responsePayload)
    expect(next).not.toHaveBeenCalled()
  })

  it('validates and saves preferences, then returns refreshed progress', async () => {
    const database = { query: vi.fn().mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [current] }) }
    requireDatabase.mockReturnValue(database)
    const res = createResponse(); const next = vi.fn()
    await saveWeeklyGoal({ body: responsePayload.goal, auth: { sub: userId } }, res, next)
    expect(database.query.mock.calls[0][1]).toEqual([userId, true, 5, 2, 1])
    expect(res.json).toHaveBeenCalledWith(responsePayload)
    expect(next).not.toHaveBeenCalled()
  })

  it('rejects missing flags, non-integers and out-of-range targets before touching the database', async () => {
    const database = { query: vi.fn() }; requireDatabase.mockReturnValue(database)
    const missing = vi.fn(); await saveWeeklyGoal({ body: {}, auth: { sub: userId } }, createResponse(), missing)
    expect(missing.mock.calls[0][0].statusCode).toBe(400)
    const invalid = vi.fn(); await saveWeeklyGoal({ body: { is_enabled: true, target_applications: 0, target_followups: 2, target_interviews: 1 }, auth: { sub: userId } }, createResponse(), invalid)
    expect(invalid.mock.calls[0][0].statusCode).toBe(400)
    expect(database.query).not.toHaveBeenCalled()
  })
})
