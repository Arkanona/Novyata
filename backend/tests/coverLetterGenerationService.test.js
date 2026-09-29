import { afterEach, describe, expect, it, vi } from 'vitest'
import { generateCoverLetter, validateCoverLetterGeneration } from '../src/services/coverLetterGenerationService.js'

describe('coverLetterGenerationService', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

  it('sends a structured OpenAI request and returns a validated draft', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-key')
    const generation = { subject: 'Candidature Product Designer', content: 'Madame, Monsieur, je souhaite vous proposer ma candidature au poste de Product Designer.' }
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ output_text: JSON.stringify(generation) }) })
    vi.stubGlobal('fetch', fetchMock)
    await expect(generateCoverLetter({ resume: { skills: [{ name: 'Figma' }] }, jobDescription: 'Offre test', companyName: 'Novyata', jobTitle: 'Product Designer' })).resolves.toEqual(generation)
    const request = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(fetchMock).toHaveBeenCalledWith('https://api.openai.com/v1/responses', expect.objectContaining({ method: 'POST', headers: expect.objectContaining({ Authorization: 'Bearer test-key' }) }))
    expect(request.text.format).toMatchObject({ type: 'json_schema', name: 'cover_letter_generation', strict: true })
  })

  it('rejects an invalid AI response', () => {
    expect(() => validateCoverLetterGeneration({ subject: '', content: 'Court' })).toThrow('réponse invalide')
  })
})
