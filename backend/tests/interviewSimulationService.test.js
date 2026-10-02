import { afterEach, describe, expect, it, vi } from 'vitest'
import { simulateInterview } from '../src/services/interviewSimulationService.js'

const valid = { question: 'Pourquoi ce poste vous intéresse-t-il ?', feedback: { positives: ['Réponse claire'], missing: 'Un exemple concret.', suggestion: 'Ajoutez une réalisation réelle.' } }
const validPro = { question: 'Décrivez une situation de collaboration.', feedback: { positives: ['Vous évoquez une collaboration réelle.'], missing: 'Le contexte reste à préciser.', suggestion: 'Précisez votre contribution exacte.', starAdvice: 'Situez le contexte et votre mission, décrivez les actions personnelles et ajoutez uniquement un résultat réellement observé.' } }
const response = (body, ok = true, status = 200) => ({ ok, status, json: vi.fn().mockResolvedValue(body) })

describe('interviewSimulationService', () => {
  const originalFetch = global.fetch
  afterEach(() => { global.fetch = originalFetch; delete process.env.OPENAI_API_KEY; delete process.env.OPENAI_MODEL })

  it('uses Responses structured output with the configured model', async () => {
    process.env.OPENAI_API_KEY = 'test-key'; process.env.OPENAI_MODEL = 'gpt-6-luna'
    global.fetch = vi.fn().mockResolvedValue(response({ output_text: JSON.stringify(valid) }))
    await expect(simulateInterview({ company: 'Novyata', jobTitle: 'Designer', answer: null })).resolves.toEqual(valid)
    const request = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(request).toMatchObject({ model: 'gpt-6-luna', reasoning: { effort: 'low' }, text: { format: { type: 'json_schema', strict: true } } })
    expect(request.text.format.schema.properties.feedback.properties.starAdvice).toBeUndefined()
  })

  it('returns expanded STAR coaching only for Pro simulation requests', async () => {
    process.env.OPENAI_API_KEY = 'test-key'
    global.fetch = vi.fn().mockResolvedValue(response({ output_text: JSON.stringify(validPro) }))
    await expect(simulateInterview({ tier: 'pro', answer: 'J’ai coordonné un atelier produit.' })).resolves.toEqual(validPro)
    const request = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(request.text.format.schema.properties.feedback.properties.starAdvice.type).toBe('string')
    expect(request.instructions).toContain('conseil STAR')
  })

  it('rejects an invalid structured response instead of exposing it', async () => {
    process.env.OPENAI_API_KEY = 'test-key'
    global.fetch = vi.fn().mockResolvedValue(response({ output_text: JSON.stringify({ question: '', feedback: {} }) }))
    await expect(simulateInterview({})).rejects.toMatchObject({ statusCode: 502 })
  })

  it('maps provider quota and timeout failures to controlled API errors', async () => {
    process.env.OPENAI_API_KEY = 'test-key'
    global.fetch = vi.fn().mockResolvedValue(response({}, false, 429))
    await expect(simulateInterview({})).rejects.toMatchObject({ statusCode: 429 })
    const timeout = new Error('timeout'); timeout.name = 'TimeoutError'
    global.fetch = vi.fn().mockRejectedValue(timeout)
    await expect(simulateInterview({})).rejects.toMatchObject({ statusCode: 504 })
  })
})
