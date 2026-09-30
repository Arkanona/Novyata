import ApiError from '../utils/ApiError.js'

const openAiTimeout = () => {
  const value = Number.parseInt(process.env.OPENAI_TIMEOUT_MS, 10)
  return Number.isFinite(value) && value > 0 ? value : 15_000
}

const analysisSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    matchScore: { type: 'integer', minimum: 0, maximum: 100 },
    matchedSkills: { type: 'array', items: { type: 'string' } },
    skillsToStrengthen: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          skill: { type: 'string' },
          detail: { type: 'string' },
        },
        required: ['skill', 'detail'],
      },
    },
    missingSkills: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          skill: { type: 'string' },
        },
        required: ['skill'],
      },
    },
    importantKeywords: { type: 'array', items: { type: 'string' } },
    suggestions: { type: 'array', items: { type: 'string' } },
  },
  required: ['matchScore', 'matchedSkills', 'skillsToStrengthen', 'missingSkills', 'importantKeywords', 'suggestions'],
}

function normalizeSkill(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ')
}

function cleanStrings(items) {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))]
}

function splitGroupedSkills(value) {
  return value.split(/\s*(?:,|;|\n)\s*|\s+et\s+/i).map((item) => item.trim()).filter(Boolean)
}

function makeSuggestionsSafe(suggestions, missingSkills) {
  return cleanStrings(suggestions).map((suggestion) => {
    const refersToMissingSkill = missingSkills.some(({ skill }) => normalizeSkill(suggestion).includes(normalizeSkill(skill)))
    const encouragesAddingSkill = /\b(ajoutez|ajouter|intégrez|intégrer)\b/i.test(suggestion)
    if (refersToMissingSkill && encouragesAddingSkill && !/à mentionner uniquement si vous maîtrisez/i.test(suggestion)) {
      return `À mentionner uniquement si vous maîtrisez cette compétence : ${suggestion}`
    }
    return suggestion
  })
}

function isSkillDetail(item) {
  return item && typeof item.skill === 'string' && typeof item.detail === 'string'
}

function isSkillReference(item) {
  return item && typeof item.skill === 'string'
}

function textFromResponse(response) {
  if (typeof response.output_text === 'string') return response.output_text
  return response.output?.flatMap((item) => item.content || []).filter((item) => item.type === 'output_text').map((item) => item.text).join('') || ''
}

export function validateAnalysis(value) {
  const stringArrays = ['matchedSkills', 'importantKeywords', 'suggestions']
  if (!value || !Number.isInteger(value.matchScore) || value.matchScore < 0 || value.matchScore > 100 || stringArrays.some((key) => !Array.isArray(value[key]) || value[key].some((item) => typeof item !== 'string')) || !Array.isArray(value.skillsToStrengthen) || value.skillsToStrengthen.some((item) => !isSkillDetail(item)) || !Array.isArray(value.missingSkills) || value.missingSkills.some((item) => !isSkillReference(item))) {
    throw new ApiError(502, 'Le service d’analyse a renvoyé une réponse invalide.')
  }

  const matchedSkills = cleanStrings(value.matchedSkills)
  const matchedSkillKeys = new Set(matchedSkills.map(normalizeSkill))
  const strengthenedSkillKeys = new Set()
  const skillsToStrengthen = value.skillsToStrengthen.reduce((items, item) => {
    const skill = item.skill.trim()
    const detail = item.detail.trim()
    const key = normalizeSkill(skill)
    if (!skill || !detail || !matchedSkillKeys.has(key) || strengthenedSkillKeys.has(key)) return items
    strengthenedSkillKeys.add(key)
    items.push({ skill, detail })
    return items
  }, [])
  const missingSkillKeys = new Set()
  const missingSkills = value.missingSkills.flatMap(({ skill }) => splitGroupedSkills(skill)).reduce((items, skill) => {
    const key = normalizeSkill(skill)
    if (!skill || matchedSkillKeys.has(key) || missingSkillKeys.has(key)) return items
    missingSkillKeys.add(key)
    items.push({ skill, message: `${skill} non mentionné — à mentionner uniquement si vous maîtrisez cette compétence.` })
    return items
  }, [])

  return {
    matchScore: value.matchScore,
    matchedSkills,
    skillsToStrengthen,
    missingSkills,
    importantKeywords: cleanStrings(value.importantKeywords),
    suggestions: makeSuggestionsSafe(value.suggestions, missingSkills),
  }
}

export async function analyzeJobDescription({ resume, jobDescription }) {
  if (!process.env.OPENAI_API_KEY) throw new ApiError(503, 'Le service d’analyse IA n’est pas configuré.')
  let response
  try {
    response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(openAiTimeout()),
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        instructions: 'Tu analyses la correspondance entre un CV et une offre d’emploi. Réponds uniquement selon le schéma JSON demandé, en français, avec des suggestions concrètes et concises. Une compétence présente dans matchedSkills ne doit jamais figurer dans missingSkills. Lorsqu’une compétence est présente mais manque de précision, ajoute-la uniquement dans skillsToStrengthen avec une action concrète à détailler (niveau, contexte ou usage), sans la présenter comme absente. Chaque élément de missingSkills ne contient qu’une seule compétence, jamais une liste regroupée. missingSkills ne contient que des compétences absentes du CV : ne suggère jamais que la personne les ajoute ou les revendique. Dans suggestions, pour toute compétence absente, utilise une formulation conditionnelle du type « À mentionner uniquement si vous maîtrisez cette compétence. »',
        input: `CV structuré :\n${JSON.stringify(resume)}\n\nOffre d’emploi :\n${jobDescription}`,
        text: { format: { type: 'json_schema', name: 'job_analysis', strict: true, schema: analysisSchema } },
      }),
    })
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') throw new ApiError(504, 'Le service d’analyse a expiré. Réessayez dans quelques instants.')
    throw new ApiError(502, 'Le service d’analyse est temporairement indisponible.')
  }
  if (!response.ok) throw new ApiError(response.status === 429 ? 429 : 502, response.status === 429 ? 'Le quota d’analyse est temporairement atteint. Réessayez plus tard.' : 'Le service d’analyse est temporairement indisponible.')
  const data = await response.json()
  try { return validateAnalysis(JSON.parse(textFromResponse(data))) } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(502, 'Le service d’analyse a renvoyé une réponse invalide.')
  }
}
