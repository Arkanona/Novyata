import ApiError from '../utils/ApiError.js'

const schema = { type: 'object', additionalProperties: false, properties: { content: { type: 'string' } }, required: ['content'] }
const outputText = (response) => typeof response.output_text === 'string' ? response.output_text : response.output?.flatMap((item) => item.content || []).filter((item) => item.type === 'output_text').map((item) => item.text).join('') || ''

export function validateFollowup(value) {
  const content = typeof value?.content === 'string' ? value.content.trim() : ''
  if (content.length < 30 || content.length > 2500) throw new ApiError(502, 'Le service de relance a renvoyé une réponse invalide.')
  return { content }
}

export async function generateFollowup(context) {
  if (!process.env.OPENAI_API_KEY) throw new ApiError(503, 'Le service IA n’est pas configuré.')
  let response
  try {
    const thanks = context.kind === 'thank_you'
    const instructions = thanks ? 'Rédige en français un message de remerciement très court après entretien. Utilise seulement le contexte fourni. N’invente jamais le nom du recruteur, un échange, une date, une promesse ou un fait sur l’entreprise. Réponds uniquement au JSON demandé.' : 'Rédige en français une relance e-mail courte, professionnelle et prudente. N’invente jamais le nom du recruteur, un échange, une date, une promesse ou un fait sur l’entreprise. Utilise seulement le contexte fourni. Réponds uniquement au JSON demandé.'
    response = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(Number(process.env.OPENAI_TIMEOUT_MS) || 60000), body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-6-luna', reasoning: { effort: 'low' }, instructions, input: JSON.stringify(context), text: { format: { type: 'json_schema', name: 'application_followup', strict: true, schema } }, max_output_tokens: 700 }) })
  } catch (error) { throw new ApiError(error?.name === 'TimeoutError' ? 504 : 502, error?.name === 'TimeoutError' ? 'La génération de relance a expiré.' : 'Le service de relance est temporairement indisponible.') }
  if (!response.ok) throw new ApiError(response.status === 429 ? 429 : 502, response.status === 429 ? 'Le quota de génération est temporairement atteint.' : 'Le service de relance est temporairement indisponible.')
  const data = await response.json()
  if (process.env.NODE_ENV !== 'production' && data.usage) console.info('OpenAI followup tokens:', data.usage)
  try { return validateFollowup(JSON.parse(outputText(data))) } catch (error) { if (error instanceof ApiError) throw error; throw new ApiError(502, 'Le service de relance a renvoyé une réponse invalide.') }
}
