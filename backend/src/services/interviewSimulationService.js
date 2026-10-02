import ApiError from '../utils/ApiError.js'
function schemaForPlan(isPro) {
  const feedbackProperties = {
    positives: { type: 'array', items: { type: 'string' }, maxItems: isPro ? 4 : 2 },
    missing: { type: 'string' },
    suggestion: { type: 'string' },
    ...(isPro ? { starAdvice: { type: 'string' } } : {}),
  }
  return { type: 'object', additionalProperties: false, properties: { question: { type: 'string' }, feedback: { type: 'object', additionalProperties: false, properties: feedbackProperties, required: Object.keys(feedbackProperties) } }, required: ['question', 'feedback'] }
}
const output=(data)=>data.output_text||data.output?.flatMap((item)=>item.content||[]).filter((item)=>item.type==='output_text').map((item)=>item.text).join('')||''
export async function simulateInterview(context) {
  const isPro = context?.tier === 'pro'
  if (!process.env.OPENAI_API_KEY) throw new ApiError(503, 'Le service IA n’est pas configuré.')
  const instructions = isPro
    ? 'Simule un entretien complet en français et personnalise chaque question uniquement selon le CV et l’offre fournis. Pose une seule question par tour. Quand une réponse est fournie, donne un retour détaillé, concret et bienveillant : points forts, point à compléter, suggestion d’amélioration et conseil STAR (situation, tâche, actions, résultat). Ne fabrique aucun détail ni résultat absent de la réponse du candidat ; indique explicitement les parties STAR qui restent à préciser. Au premier tour sans réponse, laisse le conseil STAR vide et invite le candidat à répondre. Réponds uniquement au JSON demandé.'
    : 'Simule un entretien en français à partir du poste et du CV résumés. Pose une seule question réaliste puis, si une réponse est fournie, donne un retour court. N’invente aucun fait sur le candidat. Réponds uniquement au JSON demandé.'
  let response
  try {
    response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(Number(process.env.OPENAI_TIMEOUT_MS) || 60000),
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-6-luna', reasoning: { effort: 'low' },
        instructions, input: JSON.stringify(context),
        text: { format: { type: 'json_schema', name: 'interview_simulation', strict: true, schema: schemaForPlan(isPro) } },
        max_output_tokens: isPro ? 900 : 650,
      }),
    })
  } catch (error) { throw new ApiError(error?.name === 'TimeoutError' ? 504 : 502, 'La simulation est temporairement indisponible.') }
  if (!response.ok) throw new ApiError(response.status === 429 ? 429 : 502, 'La simulation est temporairement indisponible.')
  try {
    const value = JSON.parse(output(await response.json()))
    const feedback = value?.feedback
    if (!value.question?.trim() || !feedback || !Array.isArray(feedback.positives) || feedback.positives.some((item) => typeof item !== 'string') || typeof feedback.missing !== 'string' || typeof feedback.suggestion !== 'string' || (isPro && typeof feedback.starAdvice !== 'string') || (!isPro && Object.hasOwn(feedback, 'starAdvice'))) throw new Error()
    return value
  } catch { throw new ApiError(502, 'Le service de simulation a renvoyé une réponse invalide.') }
}
