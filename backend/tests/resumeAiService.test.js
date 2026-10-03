import { afterEach, describe, expect, it, vi } from 'vitest'
import { validateExperienceImprovement, validateProfessionalSummary, generateProfessionalSummary, improveExperienceDescription, improveProfessionalSummary } from '../src/services/resumeAiService.js'

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

describe('resumeAiService', () => {
  it('validates and trims a usable summary', () => {
    expect(validateProfessionalSummary({ summary: '  Designer produit avec une expérience en recherche utilisateur et prototypage.  ' })).toEqual({ summary: 'Designer produit avec une expérience en recherche utilisateur et prototypage.' })
    expect(() => validateProfessionalSummary({ summary: 42 })).toThrow('proposition de résumé est invalide')
    expect(() => validateProfessionalSummary({ summary: 'Trop court.' })).toThrow('proposition de résumé est invalide')
  })

  it('validates experience rewrites as short editable proposals', () => {
    expect(validateExperienceImprovement({ description: '  Conception de composants réutilisables pour le produit.  ' })).toEqual({ description: 'Conception de composants réutilisables pour le produit.' })
    expect(() => validateExperienceImprovement({ description: 'Court' })).toThrow('proposition de reformulation est invalide')
    expect(() => validateExperienceImprovement({ description: ['Inventé'] })).toThrow('proposition de reformulation est invalide')
  })

  it('calls Responses with strict JSON, low reasoning, compact context and safe limits', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-key'); vi.stubEnv('OPENAI_MODEL', 'test-model')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'completed', output_text: JSON.stringify({ summary: 'Designer produit avec une expérience en recherche utilisateur et prototypage.' }), usage: { input_tokens: 50, output_tokens: 40 } }) })
    vi.stubGlobal('fetch', fetchMock)
    const result = await generateProfessionalSummary({ jobTitle: 'Designer', skills: ['Figma'] })
    const request = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(result.summary).toContain('Designer produit')
    expect(request.model).toBe('test-model')
    expect(request.reasoning.effort).toBe('low')
    expect(request.text.format.strict).toBe(true)
    expect(request.max_output_tokens).toBeLessThanOrEqual(500)
    expect(request.input).not.toMatch(/email|phone|template|accent_color/i)
  })

  it('rejects incomplete and invalid provider output', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-key')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' } }) }).mockResolvedValueOnce({ ok: true, json: async () => ({ output_text: '{broken' }) }))
    await expect(generateProfessionalSummary({ jobTitle: 'Designer' })).rejects.toThrow('réponse incomplète')
    await expect(generateProfessionalSummary({ jobTitle: 'Designer' })).rejects.toThrow('réponse invalide')
  })

  it('asks the model to rewrite only the source facts using strict compact output', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-key')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ output_text: JSON.stringify({ description: 'Conception de parcours utilisateurs et tests de prototypes.' }) }) })
    vi.stubGlobal('fetch', fetchMock)
    await expect(improveExperienceDescription({ text: 'Création de parcours et tests de prototypes.' })).resolves.toEqual({ description: 'Conception de parcours utilisateurs et tests de prototypes.' })
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.reasoning.effort).toBe('low')
    expect(body.text.format.strict).toBe(true)
    expect(body.input).toBe('{"text":"Création de parcours et tests de prototypes."}')
    expect(body.instructions).toContain('N’ajoute aucun résultat')
  })

  it('instructs summary correction to preserve facts and uses Structured Outputs', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-key')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ output_text: JSON.stringify({ summary: 'Je conçois des interfaces produit et mène des tests utilisateurs.' }) }) })
    vi.stubGlobal('fetch', fetchMock)
    await improveProfessionalSummary('Je conçoit des interface produit et mène des tests utilisateur.')
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.reasoning.effort).toBe('low')
    expect(body.text.format.strict).toBe(true)
    expect(body.instructions).toContain('n’ajoute aucune compétence')
    expect(body.input).toContain('sourceText')
  })
})
