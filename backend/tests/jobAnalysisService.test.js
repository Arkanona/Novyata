import { afterEach, describe, expect, it, vi } from 'vitest'
import { analysisLimits, analyzeJobDescription, buildAnalysisSources, buildCompactResume, validateAnalysis } from '../src/services/jobAnalysisService.js'

const resume = {
  job_title: 'Data Analyst Junior',
  summary: 'Analyse de données et création de tableaux de bord.',
  experiences: [{ job_title: 'Stagiaire BI', company: 'DataBridge', description: 'Création de requêtes SQL pour produire des indicateurs métier.' }],
  skills: [{ name: 'SQL', level: 'Avancé' }, { name: 'Power BI', level: 'Avancé' }],
  languages: [{ name: 'Français', level: 'Langue maternelle' }, { name: 'Anglais', level: 'Intermédiaire' }],
}

const empty = { importantKeywords: [], suggestions: ['Préciser un projet pertinent.'], scoreExplanation: 'Les exigences essentielles pèsent le plus.' }
const sourcesFor = (currentResume = resume) => buildAnalysisSources(buildCompactResume(currentResume))

function analysis(overrides = {}) {
  return {
    ...empty,
    matchScore: 100,
    requirements: [{ id: 'req_1', name: 'Analyse de données', importance: 'essential' }],
    strongMatches: [{ requirementId: 'req_1', sourceId: 'src_job_title', reason: 'Poste cible pertinent.' }],
    partialMatches: [], importantMissingSkills: [], optionalMissingSkills: [],
    ...overrides,
  }
}

describe('jobAnalysisService', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

  it('generates stable, backend-owned CV sources including language level', () => {
    expect(sourcesFor()).toEqual(expect.arrayContaining([
      { id: 'src_job_title', text: 'Data Analyst Junior' },
      { id: 'src_skill_1', text: 'SQL — Avancé' },
      { id: 'src_language_2', text: 'Anglais — Intermédiaire' },
      { id: 'src_exp_1_description', text: 'Création de requêtes SQL pour produire des indicateurs métier.' },
    ]))
  })

  it('sends source IDs to OpenAI and reconstructs evidence on the backend', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-key')
    const rawAnalysis = analysis({ strongMatches: [{ requirementId: 'req_1', sourceId: 'src_language_2', reason: 'Niveau indiqué dans le CV.' }] })
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ output_text: JSON.stringify(rawAnalysis) }) })
    vi.stubGlobal('fetch', fetchMock)

    await expect(analyzeJobDescription({ resume, jobDescription: 'InsightFlow recherche un Data Analyst avec un anglais intermédiaire.' })).resolves.toMatchObject({
      strongMatches: [{ requirementId: 'req_1', sourceId: 'src_language_2', evidence: 'Anglais — Intermédiaire' }],
    })

    const request = JSON.parse(fetchMock.mock.calls[0][1].body)
    const sources = JSON.parse(request.input.split('\nOffre:\n')[0].replace('Sources CV:\n', ''))
    expect(sources).toContainEqual({ id: 'src_language_2', text: 'Anglais — Intermédiaire' })
    const properties = request.text.format.schema.properties.strongMatches.items.properties
    expect(properties).toEqual(expect.objectContaining({ sourceId: expect.objectContaining({ enum: expect.arrayContaining(['src_language_2']) }) }))
    expect(properties).not.toHaveProperty('evidence')
    expect(request.instructions).toContain('choisis uniquement un sourceId fourni')
    expect(request.reasoning).toEqual({ effort: 'low' })
    expect(request.max_output_tokens).toBe(1650)
  })

  it('does not send contact, visual, technical or timestamp data to OpenAI', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-key')
    const verboseResume = { ...resume, id_resume: 'technical-id', first_name: 'Camille', email: 'camille@example.test', phone: '0600000000', city: 'Lyon', template_key: 'modern', accent_color: '#314A67', font_size: 'large', created_at: '2026-01-01' }
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ output_text: JSON.stringify(analysis()) }) })
    vi.stubGlobal('fetch', fetchMock)

    await analyzeJobDescription({ resume: verboseResume, jobDescription: 'Offre Data Analyst' })
    const input = JSON.stringify(JSON.parse(fetchMock.mock.calls[0][1].body).input)
    expect(input).not.toMatch(/camille@example|technical-id|0600000000|#314A67|2026-01-01/)
  })

  it('validates a valid sourceId and returns canonical requirement and evidence text', () => {
    const result = validateAnalysis(analysis({
      requirements: [{ id: 'req_1', name: 'Anglais professionnel', importance: 'essential' }],
      strongMatches: [{ requirementId: 'req_1', sourceId: 'src_language_2', reason: 'Niveau renseigné.' }],
    }), sourcesFor())

    expect(result.strongMatches).toEqual([{ requirementId: 'req_1', name: 'Anglais professionnel', sourceId: 'src_language_2', evidence: 'Anglais — Intermédiaire', reason: 'Niveau renseigné.' }])
    expect(result.matchScore).toBe(100)
  })

  it('accepts a partial match through its sourceId', () => {
    const result = validateAnalysis(analysis({
      requirements: [{ id: 'req_1', name: 'SQL avancé', importance: 'essential' }], strongMatches: [],
      partialMatches: [{ requirementId: 'req_1', sourceId: 'src_skill_1', reason: 'Niveau déclaré à préciser.' }],
    }), sourcesFor())

    expect(result.partialMatches).toEqual([expect.objectContaining({ sourceId: 'src_skill_1', evidence: 'SQL — Avancé' })])
    expect(result.matchScore).toBe(50)
  })

  it('rejects a sourceId that is not generated from the authenticated user CV', () => {
    expect(() => validateAnalysis(analysis({ strongMatches: [{ requirementId: 'req_1', sourceId: 'src_language_99', reason: 'Source externe.' }] }), sourcesFor())).toThrow('réponse invalide')
  })

  it('rejects a sourceId generated for another CV source set', () => {
    const otherSources = sourcesFor({ ...resume, languages: [{ name: 'Allemand', level: 'B2' }] })
    expect(otherSources).toContainEqual({ id: 'src_language_1', text: 'Allemand — B2' })
    expect(() => validateAnalysis(analysis({ strongMatches: [{ requirementId: 'req_1', sourceId: 'src_other_cv_language_1', reason: 'Source externe.' }] }), sourcesFor())).toThrow('réponse invalide')
  })

  it('rejects an unknown requirementId and a mission requirement match', () => {
    expect(() => validateAnalysis(analysis({ strongMatches: [{ requirementId: 'req_999', sourceId: 'src_skill_1', reason: 'Preuve directe.' }] }), sourcesFor())).toThrow('réponse invalide')
    expect(() => validateAnalysis(analysis({ requirements: [{ id: 'req_1', name: 'Coordonner une équipe', importance: 'mission' }] }), sourcesFor())).toThrow('réponse invalide')
  })

  it('accepts a missing skill without a sourceId', () => {
    const result = validateAnalysis(analysis({
      matchScore: 0, requirements: [{ id: 'req_1', name: 'Python', importance: 'essential' }], strongMatches: [],
      importantMissingSkills: [{ requirementId: 'req_1', reason: 'Non présent dans le CV.' }],
    }), sourcesFor())

    expect(result.importantMissingSkills).toEqual([{ requirementId: 'req_1', name: 'Python', reason: 'Non présent dans le CV.' }])
  })

  it('preserves weighted scoring with stable IDs', () => {
    const result = validateAnalysis(analysis({
      requirements: [{ id: 'req_1', name: 'SQL', importance: 'essential' }, { id: 'req_2', name: 'Power BI', importance: 'secondary' }, { id: 'req_3', name: 'Docker', importance: 'bonus' }],
      strongMatches: [{ requirementId: 'req_1', sourceId: 'src_skill_1', reason: 'Compétence renseignée.' }],
      partialMatches: [{ requirementId: 'req_2', sourceId: 'src_skill_2', reason: 'Compétence renseignée.' }],
      importantMissingSkills: [], optionalMissingSkills: [{ requirementId: 'req_3', reason: 'Non présent.' }],
    }), sourcesFor())

    expect(result.matchScore).toBe(77)
  })

  it('truncates a structurally valid optional list exceeding the configured limit', () => {
    const requirements = Array.from({ length: 6 }, (_, index) => ({ id: `req_${index + 1}`, name: `Bonus ${index + 1}`, importance: 'bonus' }))
    const result = validateAnalysis(analysis({ matchScore: 0, requirements, strongMatches: [], partialMatches: [], importantMissingSkills: [], optionalMissingSkills: requirements.map((requirement) => ({ requirementId: requirement.id, reason: 'Non présent.' })) }), sourcesFor())
    expect(result.optionalMissingSkills).toHaveLength(analysisLimits.optionalMissingSkills)
  })

  it('rejects an invalid score and malformed source object', () => {
    expect(() => validateAnalysis(analysis({ matchScore: '100' }), sourcesFor())).toThrow('réponse invalide')
    expect(() => validateAnalysis(analysis(), [{ id: 'src_skill_1' }])).toThrow('réponse invalide')
  })

  it('detects a max-output-token truncation before parsing the response', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-key'); vi.stubEnv('NODE_ENV', 'development')
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' }, output_text: '{"partial":', usage: { output_tokens: 1650 } }) }))
    await expect(analyzeJobDescription({ resume, jobDescription: 'Offre Data Analyst' })).rejects.toMatchObject({ statusCode: 502 })
    expect(consoleWarn).toHaveBeenCalledWith('OpenAI analysis truncated:', { outputTokens: 1650, maxOutputTokens: 1650, reason: 'max_output_tokens' })
    consoleWarn.mockRestore()
  })

  it('uses all configured Structured Output limits', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-key')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ output_text: JSON.stringify(analysis()) }) })
    vi.stubGlobal('fetch', fetchMock)
    await analyzeJobDescription({ resume, jobDescription: 'Offre Data Analyst' })
    const schema = JSON.parse(fetchMock.mock.calls[0][1].body).text.format.schema.properties
    Object.entries(analysisLimits).forEach(([field, limit]) => expect(schema[field].maxItems).toBe(limit))
  })
})
