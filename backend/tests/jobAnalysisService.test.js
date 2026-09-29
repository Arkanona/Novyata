import { afterEach, describe, expect, it, vi } from 'vitest'
import { analyzeJobDescription, validateAnalysis } from '../src/services/jobAnalysisService.js'

describe('jobAnalysisService', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

  it('sends a structured OpenAI request and returns a validated analysis', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-key')
    const analysis = { matchScore: 80, matchedSkills: ['Figma'], missingSkills: ['SQL'], importantKeywords: ['Produit'], suggestions: ['Ajoutez SQL à vos compétences.'] }
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ output_text: JSON.stringify(analysis) }) })
    vi.stubGlobal('fetch', fetchMock)
    await expect(analyzeJobDescription({ resume: { skills: [] }, jobDescription: 'Offre test' })).resolves.toEqual(analysis)
    expect(fetchMock).toHaveBeenCalledWith('https://api.openai.com/v1/responses', expect.objectContaining({ method: 'POST', headers: expect.objectContaining({ Authorization: 'Bearer test-key' }) }))
  })

  it('rejects an invalid AI response', () => {
    expect(() => validateAnalysis({ matchScore: 101, matchedSkills: [], missingSkills: [], importantKeywords: [], suggestions: [] })).toThrow('réponse invalide')
  })
})
