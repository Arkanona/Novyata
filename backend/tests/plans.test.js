import { describe, expect, it } from 'vitest'
import { planLimit, quotaFor } from '../src/config/plans.js'

describe('plan limits', () => {
  it('keeps resume import limits distinct from existing AI quotas', () => {
    expect(planLimit('free', 'resumeImportsPerMonth')).toBe(3)
    expect(planLimit('pro', 'resumeImportsPerMonth')).toBe(30)
    expect(planLimit('free', 'resumeShareLinks')).toBe(1)
    expect(planLimit('pro', 'resumeShareLinks')).toBe(20)
    expect(quotaFor('free', 'job_analysis')).toBe(5)
    expect(quotaFor('pro', 'job_analysis')).toBe(50)
    expect(quotaFor('free', 'resume_summary')).toBe(3)
    expect(quotaFor('pro', 'resume_summary')).toBe(20)
    expect(quotaFor('free', 'experience_rewrite')).toBe(3)
    expect(quotaFor('pro', 'experience_rewrite')).toBe(20)
  })
})
