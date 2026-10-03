import ApiError from '../utils/ApiError.js'
import { AI_FEATURES } from '../config/plans.js'
import { requestStructuredOutput } from './openAiClient.js'
function schemaForPlan(isPro) {
  const feedbackProperties = {
    positives: { type: 'array', items: { type: 'string' }, maxItems: isPro ? 4 : 2 },
    missing: { type: 'string' },
    suggestion: { type: 'string' },
    ...(isPro ? { starAdvice: { type: 'string' } } : {}),
  }
  return { type: 'object', additionalProperties: false, properties: { question: { type: 'string' }, feedback: { type: 'object', additionalProperties: false, properties: feedbackProperties, required: Object.keys(feedbackProperties) } }, required: ['question', 'feedback'] }
}
export async function simulateInterview(context, { onRequestStart } = {}) {
  const isPro = context?.tier === 'pro'
  const instructions = isPro
    ? 'Simule en français, une question par tour, selon CV/offre et préférences de recherche (souhaits, pas des faits). Après réponse : forces, point à compléter, conseil bref et conseil STAR. N’invente aucun fait ni résultat ; indique les éléments STAR à préciser. Premier tour : pas de feedback, invite à répondre. JSON seulement.'
    : 'Simule en français depuis le poste, CV et préférences (souhaits, pas faits). Une question réaliste par tour, feedback bref après réponse. N’invente aucun fait. JSON seulement.'
  return requestStructuredOutput({
    feature: AI_FEATURES.INTERVIEW_SIMULATION,
    plan: isPro ? 'pro' : 'free',
    onRequestStart,
    instructions,
    input: context,
    schema: schemaForPlan(isPro),
    schemaName: 'interview_simulation',
    errors: {
      provider: 'La simulation est temporairement indisponible.',
      timeout: 'La simulation est temporairement indisponible.',
      invalid: 'Le service de simulation a renvoyé une réponse invalide.',
      incomplete: 'Le service de simulation a renvoyé une réponse incomplète.',
    },
    validate(value) {
    const feedback = value?.feedback
    if (!value.question?.trim() || !feedback || !Array.isArray(feedback.positives) || feedback.positives.some((item) => typeof item !== 'string') || typeof feedback.missing !== 'string' || typeof feedback.suggestion !== 'string' || (isPro && typeof feedback.starAdvice !== 'string') || (!isPro && Object.hasOwn(feedback, 'starAdvice'))) throw new Error()
    return value
    },
  })
}
