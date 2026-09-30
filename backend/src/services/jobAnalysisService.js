import ApiError from '../utils/ApiError.js'

const openAiTimeout = () => {
  const value = Number.parseInt(process.env.OPENAI_TIMEOUT_MS, 10)
  return Number.isFinite(value) && value > 0 ? value : 60_000
}

const requirementImportanceLevels = ['essential', 'secondary', 'bonus', 'mission']
export const analysisLimits = Object.freeze({
  strongMatches: 5,
  partialMatches: 3,
  importantMissingSkills: 3,
  optionalMissingSkills: 3,
  importantKeywords: 6,
  suggestions: 3,
  requirements: 8,
})
const requirementSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    importance: { type: 'string', enum: requirementImportanceLevels },
  },
  required: ['id', 'name', 'importance'],
}
const missingSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    requirementId: { type: 'string' },
    reason: { type: 'string' },
  },
  required: ['requirementId', 'reason'],
}
function matchSchema(sourceIds) {
  return {
    type: 'object', additionalProperties: false,
    properties: {
      requirementId: { type: 'string' },
      sourceId: { type: 'string', enum: sourceIds.length ? sourceIds : ['src_unavailable'] },
      reason: { type: 'string' },
    },
    required: ['requirementId', 'sourceId', 'reason'],
  }
}

function analysisPropertiesForSources(sourceIds = []) {
  const sourceMatchSchema = matchSchema(sourceIds)
  return {
  matchScore: { type: 'integer', minimum: 0, maximum: 100 },
  requirements: { type: 'array', items: requirementSchema, maxItems: analysisLimits.requirements },
  strongMatches: { type: 'array', items: sourceMatchSchema, maxItems: analysisLimits.strongMatches },
  partialMatches: { type: 'array', items: sourceMatchSchema, maxItems: analysisLimits.partialMatches },
  importantMissingSkills: { type: 'array', items: missingSchema, maxItems: analysisLimits.importantMissingSkills },
  optionalMissingSkills: { type: 'array', items: missingSchema, maxItems: analysisLimits.optionalMissingSkills },
  importantKeywords: { type: 'array', items: { type: 'string' }, maxItems: analysisLimits.importantKeywords },
  suggestions: { type: 'array', items: { type: 'string' }, maxItems: analysisLimits.suggestions },
  scoreExplanation: { type: 'string' },
  }
}
const analysisRequiredFields = Object.keys(analysisPropertiesForSources())

function analysisSchemaForSources(sources) {
  const properties = analysisPropertiesForSources(sources.map((source) => source.id))
  return { type: 'object', additionalProperties: false, properties, required: analysisRequiredFields }
}

const weights = { essential: 7, secondary: 3, bonus: 1, mission: 0 }
const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ')
const cleanText = (value, maxLength = 180) => typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
const uniqueStrings = (items, max = 12) => [...new Set(items.map((item) => cleanText(item, 120)).filter(Boolean))].slice(0, max)

function twoSentences(value) {
  const text = cleanText(value, 180)
  return text.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ').trim()
}

function compactRecord(record, fields) {
  return Object.fromEntries(fields.map(([source, target, maxLength]) => [target, typeof maxLength === 'number' ? cleanText(record?.[source], maxLength) : record?.[source]]).filter(([, value]) => Array.isArray(value) ? value.length > 0 : Boolean(value)))
}

function compactCollection(items, fields, maxItems) {
  if (!Array.isArray(items)) return []
  return items.map((item) => compactRecord(item, fields)).filter((item) => Object.keys(item).length > 0).slice(0, maxItems)
}

// This is the only CV representation sent to OpenAI. It deliberately excludes
// contact data, visual preferences, identifiers and timestamps.
export function buildCompactResume(resume = {}) {
  return compactRecord({
    job_title: resume.job_title,
    summary: resume.summary,
    experiences: compactCollection(resume.experiences, [['job_title', 'jobTitle', 90], ['company', 'company', 90], ['description', 'description', 300]], 3),
    educations: compactCollection(resume.educations, [['degree', 'degree', 100], ['school', 'school', 100], ['description', 'description', 160]], 2),
    skills: compactCollection(resume.skills, [['name', 'name', 50], ['level', 'level', 20]], 12),
    languages: compactCollection(resume.languages, [['name', 'name', 50], ['level', 'level', 20]], 5),
  }, [
    ['job_title', 'jobTitle', 90],
    ['summary', 'summary', 600],
    ['experiences', 'experiences'],
    ['educations', 'educations'],
    ['skills', 'skills'],
    ['languages', 'languages'],
  ])
}

// Kept as an alias for the CV-adaptation service and older imports. New
// analysis code uses buildCompactResume explicitly so the same object can be
// passed to OpenAI and to the evidence validator.
export const createAnalysisResumeContext = buildCompactResume

function sourceText(...parts) {
  return parts.filter(Boolean).join(' — ')
}

// Sources are generated solely from the compact CV of the authenticated user.
// They are the only evidence references allowed in a new AI analysis.
export function buildAnalysisSources(compactResume = {}) {
  const sources = []
  const add = (id, text) => {
    const value = typeof text === 'string' ? text.trim() : ''
    if (value) sources.push({ id, text: value })
  }

  add('src_job_title', compactResume.jobTitle)
  add('src_summary', compactResume.summary)
  ;(compactResume.experiences || []).forEach((experience, index) => {
    const prefix = `src_exp_${index + 1}`
    add(`${prefix}_title`, sourceText(experience.jobTitle, experience.company))
    add(`${prefix}_description`, experience.description)
  })
  ;(compactResume.educations || []).forEach((education, index) => {
    const prefix = `src_education_${index + 1}`
    add(`${prefix}_title`, sourceText(education.degree, education.school))
    add(`${prefix}_description`, education.description)
  })
  ;(compactResume.skills || []).forEach((skill, index) => add(`src_skill_${index + 1}`, sourceText(skill.name, skill.level)))
  ;(compactResume.languages || []).forEach((language, index) => add(`src_language_${index + 1}`, sourceText(language.name, language.level)))
  return sources
}

function maxOutputTokens() {
  const value = Number.parseInt(process.env.OPENAI_MAX_OUTPUT_TOKENS, 10)
  return Number.isFinite(value) && value >= 800 ? value : 1650
}

function isDevelopment() {
  return process.env.NODE_ENV !== 'production'
}

function logOpenAiConfiguration() {
  if (!isDevelopment()) return
  console.info('OpenAI analysis configuration:', {
    openAiApiKeyLoaded: Boolean(process.env.OPENAI_API_KEY),
    openAiModel: process.env.OPENAI_MODEL || 'gpt-6-luna',
    openAiTimeoutMs: openAiTimeout(),
    openAiMaxOutputTokens: maxOutputTokens(),
  })
}

function logOpenAiUsage(usage) {
  if (!isDevelopment() || !usage) return
  console.info('OpenAI analysis token usage:', {
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    reasoningTokens: usage.output_tokens_details?.reasoning_tokens,
    totalTokens: usage.total_tokens,
  })
}

function logOpenAiTruncation(data) {
  if (!isDevelopment()) return
  console.warn('OpenAI analysis truncated:', {
    outputTokens: data.usage?.output_tokens,
    maxOutputTokens: maxOutputTokens(),
    reason: data.incomplete_details?.reason || 'unknown',
  })
}

function logAnalysisCounts(analysis) {
  if (!isDevelopment()) return
  console.info('OpenAI analysis result counts:', Object.fromEntries(Object.keys(analysisLimits).map((key) => [key, analysis[key]?.length ?? 0])))
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

function describeValidationValue(value) {
  if (Array.isArray(value)) return { type: 'array', length: value.length, itemKeys: value.filter((item) => item && typeof item === 'object' && !Array.isArray(item)).slice(0, 3).map((item) => Object.keys(item)) }
  if (value && typeof value === 'object') return { type: 'object', keys: Object.keys(value) }
  if (typeof value === 'string') return { type: 'string', length: value.length, value: value.slice(0, 160) }
  return { type: typeof value, value }
}

function logAnalysisResponseShape(value) {
  if (!isDevelopment()) return
  const fields = Object.fromEntries(analysisRequiredFields.map((field) => [field, describeValidationValue(value?.[field])]))
  console.info('OpenAI analysis response shape:', { keys: value && typeof value === 'object' && !Array.isArray(value) ? Object.keys(value) : [], fields })
}

function invalidAnalysis(field, expected, received) {
  if (isDevelopment()) console.error('Invalid analysis:', { field, expected, received: describeValidationValue(received) })
  throw new ApiError(502, 'Le service d’analyse a renvoyé une réponse invalide.')
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

function normalizeWhitespace(value) {
  return String(value || '').trim().replace(/\s+/g, ' ')
}

function compactJobDescription(value) {
  const description = normalizeWhitespace(value)
  if (description.length <= 2600) return description
  return `${description.slice(0, 2099)} ${description.slice(-500)}`
}

function analysisInstructions() {
  return `Analyse les sources CV et l’offre. Max ${analysisLimits.requirements} exigences scorables, IDs req_1… ; ignore les missions. Classe chaque exigence une fois avec requirementId. Pour chaque match, choisis uniquement un sourceId fourni ; n’invente aucun ID ni information. Les sources sont par pertinence décroissante. Limites ${analysisLimits.strongMatches}/${analysisLimits.partialMatches}/${analysisLimits.importantMissingSkills}/${analysisLimits.optionalMissingSkills}/${analysisLimits.importantKeywords}/${analysisLimits.suggestions}. Champs très courts ; scoreExplanation : 2 phrases.`
}

function ensureObject(item, keys, path, allowEmpty = []) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) invalidAnalysis(path, 'an object', item)
  const unexpected = Object.keys(item).find((key) => !keys.includes(key))
  if (unexpected) invalidAnalysis(`${path}.${unexpected}`, `no additional properties; expected only ${keys.join(', ')}`, item[unexpected])
  keys.forEach((key) => {
    if (!(key in item)) invalidAnalysis(`${path}.${key}`, 'a required string', undefined)
    if (typeof item[key] !== 'string') invalidAnalysis(`${path}.${key}`, 'a string', item[key])
    if (!item[key].trim() && !allowEmpty.includes(key)) invalidAnalysis(`${path}.${key}`, 'a non-empty string', item[key])
  })
}

function ensureArray(items, field) {
  if (!Array.isArray(items)) invalidAnalysis(field, 'an array', items)
}

function ensureUniqueValues(items, property, field) {
  const values = new Set()
  items.forEach((item, index) => {
    const value = String(item[property] || '')
    if (values.has(value)) invalidAnalysis(`${field}[${index}].${property}`, `a unique ${property}`, item[property])
    values.add(value)
  })
}

function cleanRequirements(items) {
  ensureArray(items, 'requirements')
  items.forEach((item, index) => {
    ensureObject(item, ['id', 'name', 'importance'], `requirements[${index}]`)
    if (!/^req_[1-9]\d*$/.test(item.id)) invalidAnalysis(`requirements[${index}].id`, 'a short requirement ID such as req_1', item.id)
    if (!requirementImportanceLevels.includes(item.importance)) invalidAnalysis(`requirements[${index}].importance`, `one of ${requirementImportanceLevels.join(', ')}`, item.importance)
  })
  ensureUniqueValues(items, 'id', 'requirements')
  const ids = new Set()
  return items.reduce((result, item) => {
    const name = cleanText(item.name, 160)
    if (!name || ids.has(item.id)) return result
    ids.add(item.id); result.push({ id: item.id, name, importance: item.importance }); return result
  }, [])
}

function cleanMatches(items, requirements, sources, field) {
  ensureArray(items, field)
  items.forEach((item, index) => ensureObject(item, ['requirementId', 'sourceId', 'reason'], `${field}[${index}]`))
  ensureUniqueValues(items, 'requirementId', field)
  const allowed = new Map(requirements.filter((item) => item.importance !== 'mission').map((item) => [item.id, item]))
  const sourceById = new Map(sources.map((source) => [source.id, source]))
  const ids = new Set()
  return items.map((item, index) => {
    const reason = cleanText(item.reason, 100)
    if (!reason) invalidAnalysis(`${field}[${index}]`, 'a non-empty reason', item)
    if (!allowed.has(item.requirementId)) invalidAnalysis(`${field}[${index}].requirementId`, 'a non-mission requirement declared in requirements', item.requirementId)
    if (ids.has(item.requirementId)) invalidAnalysis(`${field}[${index}].requirementId`, 'a requirementId used once across this match list', item.requirementId)
    if (!sourceById.has(item.sourceId)) invalidAnalysis(`${field}[${index}].sourceId`, 'a sourceId from the authenticated user CV sources', item.sourceId)
    ids.add(item.requirementId)
    return { requirementId: item.requirementId, name: allowed.get(item.requirementId).name, sourceId: item.sourceId, evidence: sourceById.get(item.sourceId).text, reason }
  })
}

function cleanMissing(items, requirements, category, field) {
  ensureArray(items, field)
  items.forEach((item, index) => ensureObject(item, ['requirementId', 'reason'], `${field}[${index}]`))
  ensureUniqueValues(items, 'requirementId', field)
  const allowed = new Map(requirements.filter((item) => category === 'optional' ? item.importance === 'bonus' : item.importance === 'essential' || item.importance === 'secondary').map((item) => [item.id, item]))
  const ids = new Set()
  return items.map((item, index) => {
    const reason = cleanText(item.reason, 100)
    if (!reason) invalidAnalysis(`${field}[${index}]`, 'a non-empty reason', item)
    if (!allowed.has(item.requirementId)) invalidAnalysis(`${field}[${index}].requirementId`, category === 'optional' ? 'a bonus requirement declared in requirements' : 'an essential or secondary requirement declared in requirements', item.requirementId)
    if (ids.has(item.requirementId)) invalidAnalysis(`${field}[${index}].requirementId`, 'a requirementId used once across this missing list', item.requirementId)
    ids.add(item.requirementId); return { requirementId: item.requirementId, name: allowed.get(item.requirementId).name, reason }
  })
}

function weightedScore(requirements, strongMatches, partialMatches) {
  const strong = new Set(strongMatches.map((item) => item.requirementId))
  const partial = new Set(partialMatches.map((item) => item.requirementId))
  const scoreable = requirements.filter((item) => weights[item.importance] > 0)
  const totalWeight = scoreable.reduce((total, item) => total + weights[item.importance], 0)
  if (!totalWeight) return 0
  const earnedWeight = scoreable.reduce((total, item) => total + (strong.has(item.id) ? weights[item.importance] : partial.has(item.id) ? weights[item.importance] * .5 : 0), 0)
  return Math.round((earnedWeight / totalWeight) * 100)
}

export function validateAnalysis(value, sources = []) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalidAnalysis('response', 'an object matching the analysis schema', value)
  analysisRequiredFields.forEach((field) => {
    if (!(field in value)) invalidAnalysis(field, 'a required field from the Structured Outputs schema', undefined)
  })
  const unexpected = Object.keys(value).find((field) => !analysisRequiredFields.includes(field))
  if (unexpected) invalidAnalysis(unexpected, 'no additional top-level properties', value[unexpected])
  if (!Number.isInteger(value.matchScore) || value.matchScore < 0 || value.matchScore > 100) invalidAnalysis('matchScore', 'an integer between 0 and 100', value.matchScore)
  ensureArray(value.importantKeywords, 'importantKeywords')
  value.importantKeywords.forEach((item, index) => { if (typeof item !== 'string') invalidAnalysis(`importantKeywords[${index}]`, 'a string', item) })
  ensureArray(value.suggestions, 'suggestions')
  value.suggestions.forEach((item, index) => { if (typeof item !== 'string') invalidAnalysis(`suggestions[${index}]`, 'a string', item) })
  if (typeof value.scoreExplanation !== 'string') invalidAnalysis('scoreExplanation', 'a string', value.scoreExplanation)

  const requirements = cleanRequirements(value.requirements)
  if (!Array.isArray(sources) || sources.some((source) => !source || typeof source.id !== 'string' || typeof source.text !== 'string')) invalidAnalysis('sources', 'CV sources generated by the backend', sources)
  const rawStrongMatches = cleanMatches(value.strongMatches, requirements, sources, 'strongMatches')
  const rawPartialMatches = cleanMatches(value.partialMatches, requirements, sources, 'partialMatches')
  const importantMissingSkills = cleanMissing(value.importantMissingSkills, requirements, 'important', 'importantMissingSkills')
  const optionalMissingSkills = cleanMissing(value.optionalMissingSkills, requirements, 'optional', 'optionalMissingSkills')

  const allClassified = [...rawStrongMatches, ...rawPartialMatches, ...importantMissingSkills, ...optionalMissingSkills].map((item) => item.requirementId)
  const strongMatches = rawStrongMatches
  const partialMatches = rawPartialMatches
  const matched = new Set([...strongMatches, ...partialMatches].map((item) => item.requirementId))
  const classifiedSet = new Set(allClassified)
  const duplicatedClassification = classifiedSet.size !== allClassified.length
  const missingClassification = requirements.some((item) => item.importance !== 'mission' && !classifiedSet.has(item.id))
  if (duplicatedClassification) {
    const duplicate = allClassified.find((name, index) => allClassified.indexOf(name) !== index)
    invalidAnalysis('classification', 'each non-mission requirement classified exactly once', duplicate)
  }
  if (missingClassification) {
    const missing = requirements.find((item) => item.importance !== 'mission' && !classifiedSet.has(item.id))
    invalidAnalysis('classification', 'each non-mission requirement classified exactly once', missing?.id)
  }
  const matchAlsoMissing = [...importantMissingSkills, ...optionalMissingSkills].find((item) => matched.has(item.requirementId))
  if (matchAlsoMissing) invalidAnalysis('classification', 'a requirement cannot be both matched and missing', matchAlsoMissing.requirementId)

  return {
    matchScore: weightedScore(requirements, strongMatches, partialMatches),
    requirements: requirements.slice(0, analysisLimits.requirements),
    strongMatches: strongMatches.slice(0, analysisLimits.strongMatches),
    partialMatches: partialMatches.slice(0, analysisLimits.partialMatches),
    importantMissingSkills: importantMissingSkills.slice(0, analysisLimits.importantMissingSkills),
    optionalMissingSkills: optionalMissingSkills.slice(0, analysisLimits.optionalMissingSkills),
    importantKeywords: uniqueStrings(value.importantKeywords, analysisLimits.importantKeywords),
    suggestions: uniqueStrings(value.suggestions, analysisLimits.suggestions),
    scoreExplanation: twoSentences(value.scoreExplanation),
    safetyNote: 'N’ajoutez une compétence à votre CV que si vous la maîtrisez réellement.',
  }
}

export async function analyzeJobDescription({ resume, jobDescription }) {
  logOpenAiConfiguration()
  if (!process.env.OPENAI_API_KEY) throw new ApiError(503, 'Le service d’analyse IA n’est pas configuré.')
  const analysisResume = buildCompactResume(resume)
  const analysisSources = buildAnalysisSources(analysisResume)
  const analysisJobDescription = compactJobDescription(jobDescription)
  let response
  try {
    response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(openAiTimeout()),
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-6-luna',
        reasoning: { effort: 'low' },
        max_output_tokens: maxOutputTokens(),
        instructions: analysisInstructions(),
        input: `Sources CV:\n${JSON.stringify(analysisSources)}\nOffre:\n${analysisJobDescription}`,
        text: { verbosity: 'low', format: { type: 'json_schema', name: 'job_analysis', strict: true, schema: analysisSchemaForSources(analysisSources) } },
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
  logOpenAiUsage(data.usage)
  if (data.status === 'incomplete' || data.incomplete_details) {
    logOpenAiTruncation(data)
    throw new ApiError(502, 'La génération de l’analyse a atteint sa limite. Réessayez dans quelques instants.')
  }
  if (data.status === 'failed' || data.error) {
    const providerError = data.error || {}
    logOpenAiFailure({ status: response.status, error: providerError })
    throw new ApiError(502, 'Le service d’analyse est temporairement indisponible.')
  }
  let parsedAnalysis
  try { parsedAnalysis = JSON.parse(textFromResponse(data)) } catch (error) {
    if (isDevelopment()) console.error('Invalid analysis:', { field: 'response', expected: 'valid JSON matching the Structured Outputs schema', received: { parseError: error.message, outputLength: textFromResponse(data).length } })
    throw new ApiError(502, 'Le service d’analyse a renvoyé une réponse invalide.')
  }
  logAnalysisResponseShape(parsedAnalysis)
  try {
    const analysis = validateAnalysis(parsedAnalysis, analysisSources)
    logAnalysisCounts(analysis)
    return analysis
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(502, 'Le service d’analyse a renvoyé une réponse invalide.')
  }
}
