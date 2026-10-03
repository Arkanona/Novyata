import { afterEach, describe, expect, it, vi } from 'vitest'
import ApiError from '../src/utils/ApiError.js'
import { generateInterviewPreparation, validateInterviewPreparation } from '../src/services/interviewPreparationService.js'

const prepared = {
  questions: [
    { category: 'rh', question: 'Pourquoi souhaitez-vous rejoindre cette équipe ?' },
    { category: 'technique', question: 'Comment abordez-vous la recherche utilisateur ?' },
    { category: 'comportementale', question: 'Racontez une collaboration difficile vécue.' },
  ],
  strengths: ['Recherche utilisateur'],
  prepare: ['Choisir un exemple réel de collaboration.'],
  recruiterQuestions: ['Comment se déroule la collaboration avec le produit ?'],
  introduction: 'Je suis designer produit et j’ai travaillé sur des parcours numériques.',
}

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks() })

describe('interviewPreparationService', () => {
  it('validates categorized RH, métier and behavioral questions', () => {
    expect(validateInterviewPreparation(prepared)).toEqual(prepared)
  })

  it('rejects missing categories, invalid categories, long questions and invalid list shapes', () => {
    expect(() => validateInterviewPreparation({ ...prepared, questions: prepared.questions.slice(0, 2) })).toThrowError(ApiError)
    expect(() => validateInterviewPreparation({ ...prepared, questions: prepared.questions.map((item, index) => index === 2 ? { ...item, category: 'other' } : item) })).toThrowError(ApiError)
    expect(() => validateInterviewPreparation({ ...prepared, questions: prepared.questions.map((item, index) => index === 0 ? { ...item, question: 'Court' } : item) })).toThrowError(ApiError)
    expect(() => validateInterviewPreparation({ ...prepared, strengths: [''] })).toThrowError(ApiError)
  })

  it('sends the categorized strict schema with low reasoning and validates the structured response', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-key')
    vi.stubEnv('OPENAI_MODEL', 'test-model')
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'completed', output_text: JSON.stringify(prepared), usage: { input_tokens: 20, output_tokens: 80 } }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetch)
    vi.spyOn(console, 'info').mockImplementation(() => {})

    await expect(generateInterviewPreparation({ jobTitle: 'Designer', cv: { skills: ['Figma'] } })).resolves.toEqual(prepared)
    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body.reasoning.effort).toBe('low')
    expect(body.text.format.schema.properties.questions.maxItems).toBe(6)
    expect(body.text.format.schema.properties.questions.items.properties.category.enum).toEqual(['rh', 'technique', 'comportementale'])
    expect(body.text.format.schema.properties.questions.items.additionalProperties).toBe(false)
    expect(body.instructions).toContain('N’invente aucun fait')
  })

  it('reports provider failures and truncated responses without parsing them', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-key')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' } }), { status: 200 })))
    await expect(generateInterviewPreparation({})).rejects.toMatchObject({ statusCode: 502, message: expect.stringContaining('incomplète') })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 503 })))
    await expect(generateInterviewPreparation({})).rejects.toMatchObject({ statusCode: 502 })
  })
})
