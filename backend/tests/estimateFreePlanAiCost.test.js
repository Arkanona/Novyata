import { describe, expect, it } from 'vitest'
import { AI_FEATURES, PLANS } from '../src/config/plans.js'
import { buildScenario, createReport, priceTokens, resolvePrices } from '../scripts/estimateFreePlanAiCost.js'

const prices = { inputPricePerMillion: 0.1, cachedInputPricePerMillion: 0.01, outputPricePerMillion: 0.5, cachedInputShare: 0 }

describe('estimateFreePlanAiCost', () => {
  it('uses the live Free quotas and counts only non-zero quota actions', () => {
    expect(PLANS.free.quotas[AI_FEATURES.CV_ADAPTATION]).toBe(0)
    expect(buildScenario(1, prices, { maximum: true }).calls).toBe(25)
  })

  it('rounds 25% and 60% expected use per feature and computes full-quota usage', () => {
    expect(buildScenario(0.25, prices).calls).toBe(7)
    expect(buildScenario(0.60, prices).calls).toBe(16)
    const full = buildScenario(1, prices, { maximum: true })
    expect(full.calls).toBe(25)
    expect(full.rows.find((item) => item.feature === AI_FEATURES.CV_ADAPTATION).calls).toBe(0)
  })

  it('does not add reasoning tokens on top of billed output tokens', () => {
    const cost = priceTokens({ inputTokens: 963, outputTokens: 829, reasoningTokens: 244 }, prices)
    expect(cost.inputCost).toBeCloseTo(0.0000963)
    expect(cost.outputCost).toBeCloseTo(0.0004145)
    expect(cost.totalCost).toBeCloseTo(0.0005108)
  })

  it('models maximum quota calls from configured input-byte and output-token hard caps', () => {
    const bounded = buildScenario(1, prices, { maximum: true, bounded: true })
    expect(bounded.outputTokens).toBeGreaterThan(0)
    expect(bounded.rows.find((item) => item.feature === AI_FEATURES.COVER_LETTER_GENERATION).outputTokens)
      .toBe(PLANS.free.quotas[AI_FEATURES.COVER_LETTER_GENERATION] * 1400)
    expect(bounded.rows.find((item) => item.feature === AI_FEATURES.COVER_LETTER_GENERATION).inputTokens)
      .toBe(PLANS.free.quotas[AI_FEATURES.COVER_LETTER_GENERATION] * (100_000 + 256))
    expect(bounded.rows.find((item) => item.feature === AI_FEATURES.CV_ADAPTATION).calls).toBe(0)
    expect(bounded.rows.every((item) => item.reasoningTokens <= item.outputTokens)).toBe(true)
  })

  it('models interview start separately from answer turns and respects the monthly cap', () => {
    const report = createReport({ prices })
    const short = report.interviewSessions.find((item) => item.calls === 4)
    const standard = report.interviewSessions.find((item) => item.calls === 6)
    const freeMaximum = report.interviewSessions.find((item) => item.calls === 5)
    expect(short.withinFreeMonthlyQuota).toBe(true)
    expect(standard.withinFreeMonthlyQuota).toBe(false)
    expect(freeMaximum.withinFreeMonthlyQuota).toBe(true)
    expect(freeMaximum.inputTokens).toBeGreaterThan(short.inputTokens)
  })

  it('does not silently apply GPT-6 Luna pricing to an unknown configured model', () => {
    expect(() => resolvePrices({ OPENAI_MODEL: 'custom-model' })).toThrow('FREE_AI_INPUT_PRICE_PER_MILLION')
    expect(resolvePrices({ OPENAI_MODEL: 'custom-model', FREE_AI_INPUT_PRICE_PER_MILLION: '1', FREE_AI_OUTPUT_PRICE_PER_MILLION: '4' })).toMatchObject({ model: 'custom-model', inputPricePerMillion: 1, outputPricePerMillion: 4 })
  })
})
