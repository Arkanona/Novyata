import { describe, expect, it, vi } from 'vitest'
import { assertAiQuota, consumeAiQuota, getAiUsage, reserveAiQuota, runWithAiQuota } from '../src/services/aiUsageService.js'
import { AI_FEATURES, currentUsagePeriod, nextUsageReset } from '../src/config/plans.js'

const userId = '8b74e3e1-64b4-46f1-bfd8-c50a174cf908'
describe('aiUsageService', () => {
  it('returns Free monthly quotas and reset date', async () => {
    const database = { query: vi.fn().mockResolvedValueOnce({ rows: [{ plan: 'free' }] }).mockResolvedValueOnce({ rows: [{ feature: AI_FEATURES.JOB_ANALYSIS, count: 2 }] }) }
    const usage = await getAiUsage(database, userId, new Date('2026-06-14T10:00:00Z'))
    expect(usage.period).toBe('2026-06'); expect(usage.resets_at).toBe('2026-07-01T00:00:00.000Z'); expect(usage.features.find((item) => item.feature === AI_FEATURES.JOB_ANALYSIS)).toMatchObject({ used: 2, limit: 5, remaining: 3 })
  })
  it('blocks Free users at their limit and keeps Pro quotas higher', async () => {
    const limited = { query: vi.fn().mockResolvedValueOnce({ rows: [{ plan: 'free' }] }).mockResolvedValueOnce({ rows: [{ feature: AI_FEATURES.JOB_ANALYSIS, count: 5 }] }) }
    await expect(assertAiQuota(limited, userId, AI_FEATURES.JOB_ANALYSIS)).rejects.toMatchObject({ statusCode: 429 })
    const pro = { query: vi.fn().mockResolvedValueOnce({ rows: [{ plan: 'pro' }] }).mockResolvedValueOnce({ rows: [{ feature: AI_FEATURES.JOB_ANALYSIS, count: 5 }] }) }
    await expect(assertAiQuota(pro, userId, AI_FEATURES.JOB_ANALYSIS)).resolves.toMatchObject({ plan: 'pro' })
  })
  it('increments usage only after a successful caller chooses to consume it', async () => {
    const database = { query: vi.fn().mockResolvedValue({ rows: [] }) }
    await consumeAiQuota(database, userId, AI_FEATURES.CV_ADAPTATION, new Date('2026-06-14T10:00:00Z'))
    expect(database.query).toHaveBeenCalledWith(expect.stringMatching(/insert into ai_usage/i), [userId, AI_FEATURES.CV_ADAPTATION, '2026-06'])
  })
  it('calculates periods at month boundaries', () => { expect(currentUsagePeriod(new Date('2026-12-31T23:00:00Z'))).toBe('2026-12'); expect(nextUsageReset(new Date('2026-12-31T23:00:00Z'))).toBe('2027-01-01T00:00:00.000Z') })

  it('atomically allows only the last remaining quota reservation under concurrency', async () => {
    const state = { plan: 'free', count: 4 }
    const database = { query: vi.fn(async (sql, values) => {
      if (/select plan from users/i.test(sql)) return { rows: [{ plan: state.plan }] }
      if (/insert into ai_usage/i.test(sql)) {
        expect(sql).toMatch(/on conflict .*do update .*where ai_usage\.count < \$4/i)
        if (state.count >= values[3]) return { rows: [] }
        state.count += 1
        return { rows: [{ count: state.count }] }
      }
      throw new Error(`Unexpected query: ${sql}`)
    }) }
    const results = await Promise.allSettled(Array.from({ length: 24 }, () => reserveAiQuota(database, userId, AI_FEATURES.JOB_ANALYSIS, new Date('2026-06-14T10:00:00Z'))))
    expect(results.filter((item) => item.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter((item) => item.status === 'rejected' && item.reason.statusCode === 429)).toHaveLength(23)
    expect(state.count).toBe(5)
  })

  it('releases a reservation on a known pre-dispatch failure but keeps one after a request starts', async () => {
    const state = { count: 0 }
    const database = { query: vi.fn(async (sql, values) => {
      if (/select plan from users/i.test(sql)) return { rows: [{ plan: 'free' }] }
      if (/insert into ai_usage/i.test(sql)) { state.count += 1; return { rows: [{ count: state.count }] } }
      if (/update ai_usage/i.test(sql)) { if (state.count > 1) { state.count -= 1; return { rows: [{ count: state.count }] } }; return { rows: [] } }
      if (/delete from ai_usage/i.test(sql)) { state.count = 0; return { rows: [] } }
      throw new Error(`Unexpected query: ${sql}`)
    }) }
    await expect(runWithAiQuota(database, userId, AI_FEATURES.JOB_ANALYSIS, async () => { throw new Error('local input error') }, new Date('2026-06-14T10:00:00Z'))).rejects.toThrow('local input error')
    expect(state.count).toBe(0)
    await expect(runWithAiQuota(database, userId, AI_FEATURES.JOB_ANALYSIS, async ({ onRequestStart }) => { onRequestStart(); throw new Error('ambiguous provider timeout') }, new Date('2026-06-14T10:00:00Z'))).rejects.toThrow('ambiguous provider timeout')
    expect(state.count).toBe(1)
  })

  it('blocks a disabled AI feature before querying or reserving quota', async () => {
    vi.stubEnv('AI_DISABLED_FEATURES', AI_FEATURES.JOB_ANALYSIS)
    const database = { query: vi.fn() }
    await expect(runWithAiQuota(database, userId, AI_FEATURES.JOB_ANALYSIS, vi.fn())).rejects.toMatchObject({ statusCode: 503 })
    expect(database.query).not.toHaveBeenCalled()
    vi.unstubAllEnvs()
  })
})
