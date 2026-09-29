import { afterEach, describe, expect, it, vi } from 'vitest'
import { analyzeJobDescription, validateAnalysis } from '../src/services/jobAnalysisService.js'

describe('jobAnalysisService', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

  it('sends a structured OpenAI request and returns a validated analysis', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-key')
    const rawAnalysis = {
      matchScore: 80,
      matchedSkills: ['Figma'],
      skillsToStrengthen: [{ skill: 'Figma', detail: 'Précisez votre niveau de maîtrise et les usages concrets.' }],
      missingSkills: [{ skill: 'SQL' }],
      importantKeywords: ['Produit'],
      suggestions: ['À mentionner uniquement si vous maîtrisez cette compétence : SQL.'],
    }
    const analysis = {
      ...rawAnalysis,
      missingSkills: [{ skill: 'SQL', message: 'SQL non mentionné — à mentionner uniquement si vous maîtrisez cette compétence.' }],
    }
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ output_text: JSON.stringify(rawAnalysis) }) })
    vi.stubGlobal('fetch', fetchMock)
    await expect(analyzeJobDescription({ resume: { skills: [] }, jobDescription: 'Offre test' })).resolves.toEqual(analysis)
    expect(fetchMock).toHaveBeenCalledWith('https://api.openai.com/v1/responses', expect.objectContaining({ method: 'POST', headers: expect.objectContaining({ Authorization: 'Bearer test-key' }) }))
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).text.format.schema.required).toContain('skillsToStrengthen')
  })

  it('rejects an invalid AI response', () => {
    expect(() => validateAnalysis({ matchScore: 101, matchedSkills: [], skillsToStrengthen: [], missingSkills: [], importantKeywords: [], suggestions: [] })).toThrow('réponse invalide')
  })

  it('keeps a detected skill out of missing skills and separates missing skill messages', () => {
    const analysis = validateAnalysis({
      matchScore: 72,
      matchedSkills: ['Figma'],
      skillsToStrengthen: [{ skill: 'Figma', detail: 'Décrivez votre niveau et un cas d’usage.' }],
      missingSkills: [{ skill: 'Figma' }, { skill: 'Jira, Métriques produit et A/B testing' }],
      importantKeywords: ['Produit'],
      suggestions: ['Ajoutez Jira à vos compétences.'],
    })

    expect(analysis.skillsToStrengthen).toEqual([{ skill: 'Figma', detail: 'Décrivez votre niveau et un cas d’usage.' }])
    expect(analysis.missingSkills).toEqual([
      { skill: 'Jira', message: 'Jira non mentionné — à mentionner uniquement si vous maîtrisez cette compétence.' },
      { skill: 'Métriques produit', message: 'Métriques produit non mentionné — à mentionner uniquement si vous maîtrisez cette compétence.' },
      { skill: 'A/B testing', message: 'A/B testing non mentionné — à mentionner uniquement si vous maîtrisez cette compétence.' },
    ])
    expect(analysis.suggestions).toEqual(['À mentionner uniquement si vous maîtrisez cette compétence : Ajoutez Jira à vos compétences.'])
  })
})
