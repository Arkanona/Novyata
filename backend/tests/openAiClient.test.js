import { afterEach, describe, expect, it, vi } from 'vitest'
import { AI_FEATURES } from '../src/config/plans.js'
import { AI_SETTINGS, aiOutputLimit } from '../src/config/ai.js'
import { requestStructuredOutput } from '../src/services/openAiClient.js'

const schema = { type: 'object', additionalProperties: false, properties: {}, required: [] }
const request = (feature, overrides = {}) => requestStructuredOutput({ feature, input: { relevant: 'input' }, instructions: 'JSON only.', schema, schemaName: 'test_output', ...overrides })

describe('openAiClient', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

  it('centralizes and always sends an explicit output cap, model, timeout and reasoning effort', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'unit-test-only-key')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ output_text: '{}' }) })
    vi.stubGlobal('fetch', fetchMock)
    for (const feature of Object.values(AI_FEATURES)) {
      await request(feature, { plan: feature === AI_FEATURES.CV_ADAPTATION ? 'pro' : 'free' })
      const body = JSON.parse(fetchMock.mock.calls.at(-1)[1].body)
      expect(body.max_output_tokens).toBeGreaterThan(0)
      expect(body.max_output_tokens).toBe(aiOutputLimit(feature, { plan: feature === AI_FEATURES.CV_ADAPTATION ? 'pro' : 'free' }))
      expect(body.model).toBe('gpt-6-luna')
      expect(body.reasoning.effort).toBe('low')
      expect(fetchMock.mock.calls.at(-1)[1].signal).toBeInstanceOf(AbortSignal)
    }
  })

  it('uses the configured bounded output for job analysis/adaptation and the Pro simulation cap', async () => {
    vi.stubEnv('OPENAI_MAX_OUTPUT_TOKENS', '1200')
    expect(aiOutputLimit(AI_FEATURES.JOB_ANALYSIS)).toBe(1200)
    expect(aiOutputLimit(AI_FEATURES.CV_ADAPTATION)).toBe(1200)
    expect(aiOutputLimit(AI_FEATURES.INTERVIEW_SIMULATION, { plan: 'pro' })).toBe(900)
  })

  it('falls back to the safe default when OPENAI_TIMEOUT_MS is invalid', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'unit-test-only-key')
    vi.stubEnv('OPENAI_TIMEOUT_MS', '-1')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ output_text: '{}' }) })
    vi.stubGlobal('fetch', fetchMock)
    await request(AI_FEATURES.JOB_ANALYSIS)
    const signal = fetchMock.mock.calls[0][1].signal
    expect(signal).toBeInstanceOf(AbortSignal)
    expect(signal.aborted).toBe(false)
  })

  it('rejects oversized inputs before dispatch and leaves reservation untouched', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'unit-test-only-key')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const onRequestStart = vi.fn()
    await expect(request(AI_FEATURES.APPLICATION_FOLLOWUP, { input: 'x'.repeat(AI_SETTINGS[AI_FEATURES.APPLICATION_FOLLOWUP].maxInputChars + 1), onRequestStart })).rejects.toMatchObject({ statusCode: 413 })
    expect(onRequestStart).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('fails closed on disabled features and missing API credentials without exposing credential values', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'unit-test-only-key')
    vi.stubEnv('AI_DISABLED_FEATURES', AI_FEATURES.COVER_LETTER_GENERATION)
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(request(AI_FEATURES.COVER_LETTER_GENERATION)).rejects.toMatchObject({ statusCode: 503, message: 'Cette fonctionnalité est temporairement indisponible.' })
    expect(fetchMock).not.toHaveBeenCalled()
    vi.stubEnv('AI_DISABLED_FEATURES', '')
    vi.stubEnv('OPENAI_API_KEY', '')
    await expect(request(AI_FEATURES.COVER_LETTER_GENERATION)).rejects.toMatchObject({ statusCode: 503 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('logs development token totals, duration, output cap and a safe estimated cost without input or secret', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('OPENAI_API_KEY', 'unit-test-only-key')
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ output_text: '{}', usage: { input_tokens: 100, input_tokens_details: { cached_tokens: 20 }, output_tokens: 50, output_tokens_details: { reasoning_tokens: 10 } } }) }))
    await request(AI_FEATURES.JOB_ANALYSIS)
    const [label, details] = info.mock.calls.find(([message]) => message === 'OpenAI usage:')
    expect(label).toBe('OpenAI usage:')
    expect(details).toMatchObject({ feature: AI_FEATURES.JOB_ANALYSIS, model: 'gpt-6-luna', inputTokens: 100, outputTokens: 50, reasoningTokens: 10, totalTokens: 150, maxOutputTokens: 1650, success: true, estimatedCostUsd: 0.0000332 })
    expect(details.durationMs).toEqual(expect.any(Number))
    expect(JSON.stringify(details)).not.toMatch(/unit-test-only-key|relevant/i)
  })
})
