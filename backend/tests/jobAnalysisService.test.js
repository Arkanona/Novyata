import { afterEach, describe, expect, it, vi } from 'vitest'
import { analyzeJobDescription, validateAnalysis } from '../src/services/jobAnalysisService.js'

const resume = {
  summary: 'Développement de composants React réutilisables et réalisation de tests fonctionnels.',
  skills: [{ name: 'React' }, { name: 'Figma' }],
  experiences: [{ description: 'Intégration de bases PostgreSQL dans une application web.' }],
}
const empty = { importantKeywords: [], suggestions: ['Préciser une réalisation pertinente.'], scoreExplanation: 'Les exigences essentielles ont le poids le plus élevé.' }

describe('jobAnalysisService', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

  it('sends a structured OpenAI request and returns a weighted validated analysis', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-key')
    const rawAnalysis = {
      ...empty,
      matchScore: 99,
      requirements: [{ name: 'React', category: 'essential' }],
      strongMatches: [{ name: 'React', evidence: 'Développement de composants React réutilisables', reason: 'La compétence est démontrée dans le résumé.' }],
      partialMatches: [], importantMissingSkills: [], optionalMissingSkills: [], importantKeywords: ['Produit'],
    }
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ output_text: JSON.stringify(rawAnalysis) }) })
    vi.stubGlobal('fetch', fetchMock)
    await expect(analyzeJobDescription({ resume, jobDescription: 'Offre React' })).resolves.toMatchObject({ matchScore: 100, strongMatches: rawAnalysis.strongMatches })
    const request = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(request.text.format).toMatchObject({ type: 'json_schema', name: 'job_analysis', strict: true })
    expect(request.reasoning).toEqual({ effort: 'low' })
    expect(request.text.format.schema.required).toContain('strongMatches')
  })

  it('classifies functional tests as a partial match for unit and integration tests', () => {
    const analysis = validateAnalysis({
      ...empty, matchScore: 100,
      requirements: [{ name: 'Tests unitaires et d’intégration', category: 'essential' }],
      strongMatches: [],
      partialMatches: [{ name: 'Tests unitaires et d’intégration', evidence: 'réalisation de tests fonctionnels', reason: 'Les tests fonctionnels sont proches mais ne couvrent pas explicitement les tests unitaires et d’intégration.' }],
      importantMissingSkills: [], optionalMissingSkills: [],
    }, resume)

    expect(analysis.partialMatches).toHaveLength(1)
    expect(analysis.strongMatches).toHaveLength(0)
    expect(analysis.matchScore).toBe(50)
  })

  it('keeps an OpenAI request error safe for the frontend', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-key')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: { type: 'invalid_request_error', code: 'invalid_json_schema', message: 'Schema invalid.', param: 'text.format.schema' } }) }))

    await expect(analyzeJobDescription({ resume, jobDescription: 'Offre React' })).rejects.toMatchObject({ statusCode: 502, message: 'La requête d’analyse est invalide. Réessayez dans quelques instants.' })
  })

  it('separates a missing mandatory requirement from a missing bonus', () => {
    const analysis = validateAnalysis({
      ...empty, matchScore: 50,
      requirements: [{ name: 'PostgreSQL avancé', category: 'essential' }, { name: 'Docker', category: 'bonus' }],
      strongMatches: [], partialMatches: [],
      importantMissingSkills: [{ name: 'PostgreSQL avancé', reason: 'Le CV mentionne PostgreSQL sans niveau avancé prouvé.' }],
      optionalMissingSkills: [{ name: 'Docker', reason: 'Docker n’apparaît pas dans le CV.' }],
    }, resume)

    expect(analysis.importantMissingSkills.map((item) => item.name)).toEqual(['PostgreSQL avancé'])
    expect(analysis.optionalMissingSkills.map((item) => item.name)).toEqual(['Docker'])
    expect(analysis.matchScore).toBe(0)
  })

  it('weights essential requirements more heavily than secondary requirements and bonuses', () => {
    const analysis = validateAnalysis({
      ...empty, matchScore: 100,
      requirements: [{ name: 'React', category: 'essential' }, { name: 'PostgreSQL', category: 'secondary' }, { name: 'Figma', category: 'bonus' }, { name: 'Coordonner les équipes', category: 'mission' }],
      strongMatches: [{ name: 'React', evidence: 'Développement de composants React réutilisables', reason: 'Preuve directe.' }, { name: 'Figma', evidence: 'Figma', reason: 'Compétence présente.' }],
      partialMatches: [],
      importantMissingSkills: [{ name: 'PostgreSQL', reason: 'La preuve disponible ne détaille pas suffisamment la compétence demandée.' }],
      optionalMissingSkills: [],
    }, resume)

    expect(analysis.matchScore).toBe(73)
  })

  it('rejects an invented evidence or an unclassified important requirement', () => {
    expect(() => validateAnalysis({
      ...empty, matchScore: 100,
      requirements: [{ name: 'React', category: 'essential' }],
      strongMatches: [{ name: 'React', evidence: 'Pilotage d’une équipe de 12 personnes', reason: 'Preuve inventée.' }],
      partialMatches: [], importantMissingSkills: [], optionalMissingSkills: [],
    }, resume)).toThrow('réponse invalide')
  })
})
