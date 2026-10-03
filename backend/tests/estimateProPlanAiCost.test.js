import { describe, expect, it } from 'vitest'
import { AI_FEATURES, PLANS } from '../src/config/plans.js'
import { AI_SETTINGS, aiOutputLimit } from '../src/config/ai.js'
import { TOKEN_METRICS, buildScenario, callMetrics } from '../scripts/estimateFreePlanAiCost.js'
import { createReport, formatReport } from '../scripts/estimateProPlanAiCost.js'

const prices = { model: 'gpt-6-luna', inputPricePerMillion: 0.1, cachedInputPricePerMillion: 0.01, outputPricePerMillion: 0.5, cachedInputShare: 0, source: 'test prices' }

describe('estimateProPlanAiCost', () => {
  it('uses current Pro quotas and does not modify the existing Free quota configuration', () => {
    expect(buildScenario(1, prices, { maximum: true, plan: 'pro' }).calls).toBe(270)
    expect(PLANS.pro.quotas[AI_FEATURES.CV_ADAPTATION]).toBe(30)
    expect(PLANS.pro.quotas[AI_FEATURES.INTERVIEW_SIMULATION]).toBe(60)
    expect(PLANS.free.quotas[AI_FEATURES.CV_ADAPTATION]).toBe(0)
  })

  it('rounds Pro quota scenarios at 25%, 50%, 75% and 100%', () => {
    expect(buildScenario(0.25, prices, { plan: 'pro' }).calls).toBe(70)
    expect(buildScenario(0.50, prices, { plan: 'pro' }).calls).toBe(135)
    expect(buildScenario(0.75, prices, { plan: 'pro' }).calls).toBe(205)
    expect(buildScenario(1, prices, { plan: 'pro', maximum: true }).calls).toBe(270)
  })

  it('models the CV adaptation as one call using saved context and six max proposals', () => {
    const perAction = callMetrics(AI_FEATURES.CV_ADAPTATION, 1, { plan: 'pro' })
    expect(perAction.calls).toBe(1)
    expect(TOKEN_METRICS[AI_FEATURES.CV_ADAPTATION].label).toContain('Adaptation')
    expect(callMetrics(AI_FEATURES.CV_ADAPTATION, 30, { plan: 'pro' }).calls).toBe(30)
  })

  it('models Pro interview output caps and 5-question, 10-question, and monthly-limit sessions', () => {
    const freeAnswer = callMetrics(AI_FEATURES.INTERVIEW_SIMULATION, 2, { plan: 'free' })
    const proAnswer = callMetrics(AI_FEATURES.INTERVIEW_SIMULATION, 2, { plan: 'pro' })
    expect(proAnswer.outputTokens).toBeGreaterThan(freeAnswer.outputTokens)
    const report = createReport({ prices, eurPerUsd: 1 })
    expect(report.interviewSessions.map((item) => [item.calls, item.withinMonthlyQuota])).toEqual([[6, true], [11, true], [60, true]])
    expect(report.interviewSessions[2].outputTokens).toBe(60 * aiOutputLimit(AI_FEATURES.INTERVIEW_SIMULATION, { plan: 'pro' }))
  })

  it('calculates scale, nominal price margins, and break-even multiples without calling OpenAI', () => {
    const report = createReport({ prices, eurPerUsd: 1 })
    expect(report.maximum.calls).toBe(270)
    expect(report.scaled.map((item) => item.users)).toEqual([10, 100, 1000, 10000, 100000])
    expect(report.subscriptionEconomics.map((item) => item.price)).toEqual([4.99, 7.99, 9.99, 14.99])
    expect(report.subscriptionEconomics.every((item) => item.averageMarginEuro < item.price)).toBe(true)
    expect(report.subscriptionEconomics.every((item) => !item.modeledQuotaCanReachPrice)).toBe(true)
    const text = formatReport(report)
    expect(text).toContain('lettre 1400')
    expect(text).toContain('plafond de sortie et taille de requête')
    expect(text).toContain('budget IA')
    expect(text).not.toContain('aucun plafond')
    expect(formatReport(report)).not.toContain('test-key')
  })

  it('computes Pro maximum cost from the shared configured byte/output limits', () => {
    const report = createReport({ prices, eurPerUsd: 1 })
    const letter = report.featureCosts.find((row) => row.feature === AI_FEATURES.COVER_LETTER_GENERATION)
    expect(letter.outputTokens).toBe(PLANS.pro.quotas[AI_FEATURES.COVER_LETTER_GENERATION] * 1400)
    expect(letter.inputTokens).toBe(PLANS.pro.quotas[AI_FEATURES.COVER_LETTER_GENERATION] * (AI_SETTINGS[AI_FEATURES.COVER_LETTER_GENERATION].maxRequestBytes + 256))
    expect(report.maximum.outputTokens).toBeGreaterThan(0)
    expect(report.maximum.reasoningTokens).toBeLessThanOrEqual(report.maximum.outputTokens)
  })
})
