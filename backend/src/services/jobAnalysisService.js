import ApiError from '../utils/ApiError.js'

const openAiTimeout = () => {
  const value = Number.parseInt(process.env.OPENAI_TIMEOUT_MS, 10)
  return Number.isFinite(value) && value > 0 ? value : 60_000
}

const requirementCategories = ['essential', 'secondary', 'bonus', 'mission']
const requirementSchema = {
  type: 'object', additionalProperties: false,
  properties: { name: { type: 'string' }, category: { type: 'string', enum: requirementCategories } },
  required: ['name', 'category'],
}
const matchSchema = {
  type: 'object', additionalProperties: false,
  properties: { name: { type: 'string' }, evidence: { type: 'string' }, reason: { type: 'string' } },
  required: ['name', 'evidence', 'reason'],
}
const missingSchema = {
  type: 'object', additionalProperties: false,
  properties: { name: { type: 'string' }, reason: { type: 'string' } },
  required: ['name', 'reason'],
}
const analysisSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    matchScore: { type: 'integer', minimum: 0, maximum: 100 },
    requirements: { type: 'array', items: requirementSchema },
    strongMatches: { type: 'array', items: matchSchema },
    partialMatches: { type: 'array', items: matchSchema },
    importantMissingSkills: { type: 'array', items: missingSchema },
    optionalMissingSkills: { type: 'array', items: missingSchema },
    importantKeywords: { type: 'array', items: { type: 'string' } },
    suggestions: { type: 'array', items: { type: 'string' } },
    scoreExplanation: { type: 'string' },
  },
  required: ['matchScore', 'requirements', 'strongMatches', 'partialMatches', 'importantMissingSkills', 'optionalMissingSkills', 'importantKeywords', 'suggestions', 'scoreExplanation'],
}

const weights = { essential: 7, secondary: 3, bonus: 1, mission: 0 }
const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ')
const cleanText = (value, maxLength = 240) => typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
const uniqueStrings = (items, max = 12) => [...new Set(items.map((item) => cleanText(item, 180)).filter(Boolean))].slice(0, max)

function isDevelopment() {
  return process.env.NODE_ENV !== 'production'
}

function logOpenAiConfiguration() {
  if (!isDevelopment()) return
  console.info('OpenAI analysis configuration:', {
    openAiApiKeyLoaded: Boolean(process.env.OPENAI_API_KEY),
    openAiModel: process.env.OPENAI_MODEL || 'gpt-6-luna',
    openAiTimeoutMs: openAiTimeout(),
  })
}

function logOpenAiFailure({ status, error = {}, cause } = {}) {
  if (!isDevelopment()) return
  console.error('OpenAI analysis failure:', {
    status,
    code: error.code,
    type: error.type,
    message: error.message,
    param: error.param,
    causeName: cause?.name,
    causeCode: cause?.cause?.code || cause?.code,
    causeMessage: cause?.message,
  })
}

function providerApiError(status) {
  if (status === 429) return new ApiError(429, 'Le quota d’analyse est temporairement atteint. Réessayez plus tard.')
  if (status === 401) return new ApiError(502, 'La configuration du service d’analyse est invalide.')
  if (status === 400) return new ApiError(502, 'La requête d’analyse est invalide. Réessayez dans quelques instants.')
  if (status === 404) return new ApiError(502, 'Le modèle d’analyse est indisponible.')
  if (status >= 500) return new ApiError(502, 'Le service d’analyse est temporairement indisponible.')
  return new ApiError(502, 'Le service d’analyse est temporairement indisponible.')
}

function textFromResponse(response) {
  if (typeof response.output_text === 'string') return response.output_text
  return response.output?.flatMap((item) => item.content || []).filter((item) => item.type === 'output_text').map((item) => item.text).join('') || ''
}

function resumeText(resume) {
  const values = [resume.first_name, resume.last_name, resume.job_title, resume.summary, ...(resume.experiences || []).flatMap((item) => [item.job_title, item.company, item.description]), ...(resume.educations || []).flatMap((item) => [item.degree, item.school, item.description]), ...(resume.skills || []).flatMap((item) => [item.name, item.level]), ...(resume.languages || []).flatMap((item) => [item.name, item.level])]
  return normalize(values.filter(Boolean).join(' '))
}

function validObject(item, keys) {
  return item && typeof item === 'object' && keys.every((key) => typeof item[key] === 'string')
}

function cleanRequirements(items) {
  if (!Array.isArray(items) || items.some((item) => !validObject(item, ['name', 'category']) || !requirementCategories.includes(item.category))) return null
  const names = new Set()
  return items.reduce((result, item) => {
    const name = cleanText(item.name, 160); const key = normalize(name)
    if (!name || names.has(key)) return result
    names.add(key); result.push({ name, category: item.category }); return result
  }, [])
}

function cleanMatches(items, requirements, sourceText) {
  if (!Array.isArray(items) || items.some((item) => !validObject(item, ['name', 'evidence', 'reason']))) return null
  const allowed = new Map(requirements.filter((item) => item.category !== 'mission').map((item) => [normalize(item.name), item]))
  const names = new Set()
  return items.reduce((result, item) => {
    const name = cleanText(item.name, 160); const evidence = cleanText(item.evidence); const reason = cleanText(item.reason); const key = normalize(name)
    if (!name || !evidence || !reason || !allowed.has(key) || names.has(key) || !sourceText.includes(normalize(evidence))) return result
    names.add(key); result.push({ name: allowed.get(key).name, evidence, reason }); return result
  }, [])
}

function cleanMissing(items, requirements, category) {
  if (!Array.isArray(items) || items.some((item) => !validObject(item, ['name', 'reason']))) return null
  const allowed = new Map(requirements.filter((item) => category === 'optional' ? item.category === 'bonus' : item.category === 'essential' || item.category === 'secondary').map((item) => [normalize(item.name), item]))
  const names = new Set()
  return items.reduce((result, item) => {
    const name = cleanText(item.name, 160); const reason = cleanText(item.reason); const key = normalize(name)
    if (!name || !reason || !allowed.has(key) || names.has(key)) return result
    names.add(key); result.push({ name: allowed.get(key).name, reason }); return result
  }, [])
}

function weightedScore(requirements, strongMatches, partialMatches) {
  const strong = new Set(strongMatches.map((item) => normalize(item.name)))
  const partial = new Set(partialMatches.map((item) => normalize(item.name)))
  const scoreable = requirements.filter((item) => weights[item.category] > 0)
  const totalWeight = scoreable.reduce((total, item) => total + weights[item.category], 0)
  if (!totalWeight) return 0
  const earnedWeight = scoreable.reduce((total, item) => total + (strong.has(normalize(item.name)) ? weights[item.category] : partial.has(normalize(item.name)) ? weights[item.category] * .5 : 0), 0)
  return Math.round((earnedWeight / totalWeight) * 100)
}

export function validateAnalysis(value, resume = {}) {
  if (!value || !Number.isInteger(value.matchScore) || value.matchScore < 0 || value.matchScore > 100 || !Array.isArray(value.importantKeywords) || value.importantKeywords.some((item) => typeof item !== 'string') || !Array.isArray(value.suggestions) || value.suggestions.some((item) => typeof item !== 'string') || typeof value.scoreExplanation !== 'string') throw new ApiError(502, 'Le service d’analyse a renvoyé une réponse invalide.')

  const requirements = cleanRequirements(value.requirements)
  if (!requirements) throw new ApiError(502, 'Le service d’analyse a renvoyé une réponse invalide.')
  const sourceText = resumeText(resume)
  const strongMatches = cleanMatches(value.strongMatches, requirements, sourceText)
  const partialMatches = cleanMatches(value.partialMatches, requirements, sourceText)
  const importantMissingSkills = cleanMissing(value.importantMissingSkills, requirements, 'important')
  const optionalMissingSkills = cleanMissing(value.optionalMissingSkills, requirements, 'optional')
  if (!strongMatches || !partialMatches || !importantMissingSkills || !optionalMissingSkills) throw new ApiError(502, 'Le service d’analyse a renvoyé une réponse invalide.')

  const allClassified = [...strongMatches, ...partialMatches, ...importantMissingSkills, ...optionalMissingSkills].map((item) => normalize(item.name))
  const matched = new Set([...strongMatches, ...partialMatches].map((item) => normalize(item.name)))
  const classifiedSet = new Set(allClassified)
  const duplicatedClassification = classifiedSet.size !== allClassified.length
  const missingClassification = requirements.some((item) => item.category !== 'mission' && !classifiedSet.has(normalize(item.name)))
  if (duplicatedClassification || missingClassification || [...importantMissingSkills, ...optionalMissingSkills].some((item) => matched.has(normalize(item.name)))) throw new ApiError(502, 'Le service d’analyse a renvoyé une réponse invalide.')

  return {
    matchScore: weightedScore(requirements, strongMatches, partialMatches),
    requirements,
    strongMatches,
    partialMatches,
    importantMissingSkills,
    optionalMissingSkills,
    importantKeywords: uniqueStrings(value.importantKeywords),
    suggestions: uniqueStrings(value.suggestions, 6).slice(0, 6),
    scoreExplanation: cleanText(value.scoreExplanation, 360),
    safetyNote: 'N’ajoutez une compétence à votre CV que si vous la maîtrisez réellement.',
  }
}

export async function analyzeJobDescription({ resume, jobDescription }) {
  logOpenAiConfiguration()
  if (!process.env.OPENAI_API_KEY) throw new ApiError(503, 'Le service d’analyse IA n’est pas configuré.')
  let response
  try {
    response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(openAiTimeout()),
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-6-luna',
        reasoning: { effort: 'low' },
        instructions: 'Tu analyses la correspondance entre un CV et une offre d’emploi, en français. Commence par classer les exigences de l’offre : essential (indispensable/obligatoire), secondary (importante mais non éliminatoire), bonus (appréciée) ou mission (responsabilité du poste, jamais une compétence exigée par défaut). Chaque exigence doit avoir un nom concis et être unique. Pour chaque exigence hors mission, choisis exactement un statut : strongMatches si le CV apporte une preuve directe, partialMatches si le CV est proche mais insuffisant, importantMissingSkills si une exigence essential ou secondary est absente, optionalMissingSkills si un bonus est absent. Le nom des correspondances et manques doit reprendre exactement le nom d’une exigence classée. Une preuve est une courte citation exacte du CV, jamais une paraphrase ni une invention. Des tests fonctionnels ne sont pas des tests unitaires et d’intégration : c’est une correspondance partielle au mieux. Un niveau d’anglais inférieur à l’exigence est partiel, jamais fort. Ne transforme pas une mission en exigence. Les suggestions, 4 à 6 maximum, sont classées par priorité et concrètes. N’invite jamais à ajouter ou revendiquer une compétence absente. scoreExplanation explique brièvement la pondération. Réponds uniquement selon le schéma JSON demandé.',
        input: `CV structuré (seule source des faits et preuves) :\n${JSON.stringify(resume)}\n\nOffre d’emploi :\n${jobDescription}`,
        text: { format: { type: 'json_schema', name: 'job_analysis', strict: true, schema: analysisSchema } },
      }),
    })
  } catch (error) {
    logOpenAiFailure({ cause: error })
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') throw new ApiError(504, 'Le service d’analyse a expiré. Réessayez dans quelques instants.')
    throw new ApiError(502, 'Le service d’analyse est temporairement indisponible.')
  }
  if (!response.ok) {
    // Keep the provider detail in the backend terminal only: it is useful for
    // configuration diagnostics while the browser keeps a safe error message.
    let providerError = {}
    try { providerError = (await response.json()).error || {} } catch { /* Non-JSON provider response. */ }
    logOpenAiFailure({ status: response.status, error: providerError })
    throw providerApiError(response.status)
  }
  const data = await response.json()
  if (data.status === 'failed' || data.status === 'incomplete' || data.error) {
    const providerError = data.error || data.incomplete_details || {}
    logOpenAiFailure({ status: response.status, error: providerError })
    throw new ApiError(502, 'Le service d’analyse a renvoyé une réponse incomplète.')
  }
  try { return validateAnalysis(JSON.parse(textFromResponse(data)), resume) } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(502, 'Le service d’analyse a renvoyé une réponse invalide.')
  }
}
