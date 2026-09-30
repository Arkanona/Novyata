import ApiError from '../utils/ApiError.js'

const openAiTimeout = () => {
  const value = Number.parseInt(process.env.OPENAI_TIMEOUT_MS, 10)
  return Number.isFinite(value) && value > 0 ? value : 15_000
}

const generationSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    subject: { type: 'string' },
    content: { type: 'string' },
  },
  required: ['subject', 'content'],
}

function textFromResponse(response) {
  if (typeof response.output_text === 'string') return response.output_text
  return response.output?.flatMap((item) => item.content || []).filter((item) => item.type === 'output_text').map((item) => item.text).join('') || ''
}

export function validateCoverLetterGeneration(value) {
  const subject = typeof value?.subject === 'string' ? value.subject.trim() : ''
  const content = typeof value?.content === 'string' ? value.content.trim() : ''
  if (!subject || subject.length > 255 || content.length < 20 || content.length > 12000) {
    throw new ApiError(502, 'Le service de génération a renvoyé une réponse invalide.')
  }
  return { subject, content }
}

export async function generateCoverLetter({ resume, jobDescription, companyName, jobTitle }) {
  if (!process.env.OPENAI_API_KEY) throw new ApiError(503, 'Le service de génération IA n’est pas configuré.')

  let response
  try {
    response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(openAiTimeout()),
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        instructions: 'Tu rédiges une lettre de motivation en français, professionnelle, naturelle et crédible. Utilise uniquement les éléments factuels du CV fourni et les informations de l’offre. N’invente jamais une expérience, un diplôme, une compétence, une responsabilité ou un résultat. Si une information manque, ne la suppose pas. Personnalise la lettre pour l’offre et mets en avant uniquement les compétences réellement présentes dans le CV. Réponds uniquement selon le schéma JSON demandé.',
        input: `CV structuré :\n${JSON.stringify(resume)}\n\nOffre d’emploi :\n${jobDescription}\n\nEntreprise indiquée : ${companyName || 'Non précisée'}\nPoste visé indiqué : ${jobTitle || resume.job_title || 'Non précisé'}`,
        text: { format: { type: 'json_schema', name: 'cover_letter_generation', strict: true, schema: generationSchema } },
      }),
    })
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') throw new ApiError(504, 'Le service de génération a expiré. Réessayez dans quelques instants.')
    throw new ApiError(502, 'Le service de génération est temporairement indisponible.')
  }
  if (!response.ok) throw new ApiError(response.status === 429 ? 429 : 502, response.status === 429 ? 'Le quota de génération est temporairement atteint. Réessayez plus tard.' : 'Le service de génération est temporairement indisponible.')

  const data = await response.json()
  try {
    return validateCoverLetterGeneration(JSON.parse(textFromResponse(data)))
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(502, 'Le service de génération a renvoyé une réponse invalide.')
  }
}
