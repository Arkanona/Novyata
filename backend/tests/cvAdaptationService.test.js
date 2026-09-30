import { afterEach, describe, expect, it, vi } from 'vitest'
import { proposeCvAdaptation, validateAdaptation } from '../src/services/cvAdaptationService.js'

const resume = {
  summary: 'Designer produit spécialisé dans les parcours utilisateurs.',
  experiences: [{ job_title: 'Product Designer', company: 'Novyata', description: 'Conception de maquettes et de prototypes.' }],
  skills: [{ name: 'Figma', level: 'Avancé' }],
}

const proposal = { id: 'summary-1', field: 'summary', targetIndex: 0, currentText: resume.summary, proposedText: 'Designer produit spécialisé dans la conception de parcours utilisateurs et de prototypes.', reason: 'Met en avant une expérience déjà présente.' }

describe('cvAdaptationService', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

  it('requests a short structured adaptation without personal CV data', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-key')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ output_text: JSON.stringify({ proposals: [proposal] }) }) })
    vi.stubGlobal('fetch', fetchMock)

    await expect(proposeCvAdaptation({ resume: { ...resume, email: 'marie@example.test', phone: '0600000000', id_resume: 'technical-id' }, analysis: { importantKeywords: ['Produit'] }, jobDescription: 'Offre Product Designer.' })).resolves.toEqual({ proposals: [proposal] })
    const request = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(request.reasoning).toEqual({ effort: 'low' })
    expect(request.max_output_tokens).toBe(1800)
    expect(request.text.format).toMatchObject({ type: 'json_schema', name: 'cv_adaptation', strict: true })
    expect(request.input).not.toMatch(/marie@example|0600000000|technical-id/)
  })

  it('rejects an AI proposal that does not reproduce the original text exactly', () => {
    expect(() => validateAdaptation({ proposals: [{ ...proposal, currentText: 'Texte inventé' }] }, resume)).toThrow('réponse invalide')
  })

  it('rejects more than six proposals', () => {
    expect(() => validateAdaptation({ proposals: Array.from({ length: 7 }, (_, index) => ({ ...proposal, id: `summary-${index}`, targetIndex: index })) }, resume)).toThrow('réponse invalide')
  })
})
