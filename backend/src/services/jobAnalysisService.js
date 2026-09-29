import ApiError from '../utils/ApiError.js'

const analysisSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    matchScore: { type: 'integer', minimum: 0, maximum: 100 },
    matchedSkills: { type: 'array', items: { type: 'string' } },
    missingSkills: { type: 'array', items: { type: 'string' } },
    importantKeywords: { type: 'array', items: { type: 'string' } },
    suggestions: { type: 'array', items: { type: 'string' } },
  },
  required: ['matchScore', 'matchedSkills', 'missingSkills', 'importantKeywords', 'suggestions'],
}

function textFromResponse(response) {
  if (typeof response.output_text === 'string') return response.output_text
  return response.output?.flatMap((item) => item.content || []).filter((item) => item.type === 'output_text').map((item) => item.text).join('') || ''
}

export function validateAnalysis(value) {
  const arrays = ['matchedSkills', 'missingSkills', 'importantKeywords', 'suggestions']
  if (!value || !Number.isInteger(value.matchScore) || value.matchScore < 0 || value.matchScore > 100 || arrays.some((key) => !Array.isArray(value[key]) || value[key].some((item) => typeof item !== 'string'))) {
    throw new ApiError(502, 'Le service d’analyse a renvoyé une réponse invalide.')
  }
  return {
    matchScore: value.matchScore,
    matchedSkills: value.matchedSkills.map((item) => item.trim()).filter(Boolean),
    missingSkills: value.missingSkills.map((item) => item.trim()).filter(Boolean),
    importantKeywords: value.importantKeywords.map((item) => item.trim()).filter(Boolean),
    suggestions: value.suggestions.map((item) => item.trim()).filter(Boolean),
  }
}

export async function analyzeJobDescription({ resume, jobDescription }) {
  if (!process.env.OPENAI_API_KEY) throw new ApiError(503, 'Le service d’analyse IA n’est pas configuré.')
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      instructions: 'Tu analyses la correspondance entre un CV et une offre d’emploi. Ne propose jamais de compétences inventées. Réponds uniquement selon le schéma JSON demandé, en français, avec des suggestions concrètes et concises.',
      input: `CV structuré :\n${JSON.stringify(resume)}\n\nOffre d’emploi :\n${jobDescription}`,
      text: { format: { type: 'json_schema', name: 'job_analysis', strict: true, schema: analysisSchema } },
    }),
  })
  if (!response.ok) throw new ApiError(502, 'Le service d’analyse est temporairement indisponible.')
  const data = await response.json()
  try { return validateAnalysis(JSON.parse(textFromResponse(data))) } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(502, 'Le service d’analyse a renvoyé une réponse invalide.')
  }
}
