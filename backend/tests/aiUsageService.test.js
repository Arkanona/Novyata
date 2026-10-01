import { describe, expect, it, vi } from 'vitest'
import { assertAiQuota, consumeAiQuota, getAiUsage } from '../src/services/aiUsageService.js'
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
})
