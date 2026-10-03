import ApiError from '../utils/ApiError.js'

const summarySchema = {
  type: 'object',
  additionalProperties: false,
  properties: { summary: { type: 'string', description: 'Résumé professionnel concis, fidèle aux informations fournies.' } },
  required: ['summary'],
}
const experienceSchema = {
  type: 'object', additionalProperties: false,
  properties: { description: { type: 'string', description: 'Reformulation professionnelle, fidèle au texte source et sans fait nouveau.' } },
  required: ['description'],
}

export function validateProfessionalSummary(value) {
  if (!value || typeof value.summary !== 'string') throw new ApiError(502, 'La proposition de résumé est invalide.')
  const summary = value.summary.trim()
  if (summary.length < 40 || summary.length > 650) throw new ApiError(502, 'La proposition de résumé est invalide.')
  return { summary }
}

export async function generateProfessionalSummary(context) {
  if (!process.env.OPENAI_API_KEY) throw new ApiError(503, 'Le service IA n’est pas configuré.')
  let response
  try {
    response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(Number(process.env.OPENAI_TIMEOUT_MS) || 60000),
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-6-luna',
        reasoning: { effort: 'low' },
        instructions: 'Rédige en français un résumé professionnel concis (2 à 4 phrases) à partir des seuls faits fournis. Ne déduis ni compétence, expérience, diplôme, résultat ni objectif absent. Retourne uniquement le JSON demandé.',
        input: JSON.stringify(context),
        text: { format: { type: 'json_schema', name: 'professional_summary', strict: true, schema: summarySchema } },
        max_output_tokens: 500,
      }),
    })
  } catch (error) {
    throw new ApiError(error?.name === 'TimeoutError' ? 504 : 502, error?.name === 'TimeoutError' ? 'La génération du résumé a expiré.' : 'Le service IA est temporairement indisponible.')
  }
  if (!response.ok) throw new ApiError(response.status === 429 ? 429 : 502, 'Le service IA est temporairement indisponible.')
  const data = await response.json()
  if (process.env.NODE_ENV !== 'production' && data.usage) console.info('OpenAI professional summary tokens:', data.usage)
  if (data.status === 'incomplete' || data.incomplete_details || data.status === 'failed' || data.error) throw new ApiError(502, 'La génération du résumé a renvoyé une réponse incomplète.')
  const output = typeof data.output_text === 'string' ? data.output_text : data.output?.flatMap((item) => item.content || []).filter((item) => item.type === 'output_text').map((item) => item.text).join('') || ''
  try { return validateProfessionalSummary(JSON.parse(output)) } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(502, 'La génération du résumé a renvoyé une réponse invalide.')
  }
}

export async function improveProfessionalSummary(sourceText) {
  if (!process.env.OPENAI_API_KEY) throw new ApiError(503, 'Le service IA n’est pas configuré.')
  let response
  try {
    response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(Number(process.env.OPENAI_TIMEOUT_MS) || 60000),
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-6-luna', reasoning: { effort: 'low' },
        instructions: 'Corrige et reformule ce résumé en français pour plus de clarté et de professionnalisme. Préserve tous les faits et n’ajoute aucune compétence, expérience, qualité, diplôme ou résultat. JSON seulement.',
        input: JSON.stringify({ sourceText }),
        text: { format: { type: 'json_schema', name: 'professional_summary', strict: true, schema: summarySchema } },
        max_output_tokens: 500,
      }),
    })
  } catch (error) { throw new ApiError(error?.name === 'TimeoutError' ? 504 : 502, error?.name === 'TimeoutError' ? 'La reformulation a expiré.' : 'Le service IA est temporairement indisponible.') }
  if (!response.ok) throw new ApiError(response.status === 429 ? 429 : 502, 'Le service IA est temporairement indisponible.')
  const data = await response.json()
  if (process.env.NODE_ENV !== 'production' && data.usage) console.info('OpenAI summary rewrite tokens:', data.usage)
  if (data.status === 'incomplete' || data.incomplete_details || data.status === 'failed' || data.error) throw new ApiError(502, 'La reformulation a renvoyé une réponse incomplète.')
  const output = typeof data.output_text === 'string' ? data.output_text : data.output?.flatMap((item) => item.content || []).filter((item) => item.type === 'output_text').map((item) => item.text).join('') || ''
  try { return validateProfessionalSummary(JSON.parse(output)) } catch (error) { if (error instanceof ApiError) throw error; throw new ApiError(502, 'La reformulation a renvoyé une réponse invalide.') }
}

export function validateExperienceImprovement(value) {
  if (!value || typeof value.description !== 'string') throw new ApiError(502, 'La proposition de reformulation est invalide.')
  const description = value.description.trim()
  if (description.length < 10 || description.length > 1200) throw new ApiError(502, 'La proposition de reformulation est invalide.')
  return { description }
}

export async function improveExperienceDescription(context) {
  if (!process.env.OPENAI_API_KEY) throw new ApiError(503, 'Le service IA n’est pas configuré.')
  let response
  try {
    response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(Number(process.env.OPENAI_TIMEOUT_MS) || 60000),
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-6-luna',
        reasoning: { effort: 'low' },
        instructions: 'Reformule en français le texte d’expérience pour le rendre clair, précis et professionnel. Préserve exactement les faits source. N’ajoute aucun résultat, chiffre, responsabilité, outil ou technologie. JSON demandé seulement.',
        input: JSON.stringify(context),
        text: { format: { type: 'json_schema', name: 'experience_improvement', strict: true, schema: experienceSchema } },
        max_output_tokens: 500,
      }),
    })
  } catch (error) {
    throw new ApiError(error?.name === 'TimeoutError' ? 504 : 502, error?.name === 'TimeoutError' ? 'La reformulation a expiré.' : 'Le service IA est temporairement indisponible.')
  }
  if (!response.ok) throw new ApiError(response.status === 429 ? 429 : 502, 'Le service IA est temporairement indisponible.')
  const data = await response.json()
  if (process.env.NODE_ENV !== 'production' && data.usage) console.info('OpenAI experience rewrite tokens:', data.usage)
  if (data.status === 'incomplete' || data.incomplete_details || data.status === 'failed' || data.error) throw new ApiError(502, 'La reformulation a renvoyé une réponse incomplète.')
  const output = typeof data.output_text === 'string' ? data.output_text : data.output?.flatMap((item) => item.content || []).filter((item) => item.type === 'output_text').map((item) => item.text).join('') || ''
  try { return validateExperienceImprovement(JSON.parse(output)) } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(502, 'La reformulation a renvoyé une réponse invalide.')
  }
}
