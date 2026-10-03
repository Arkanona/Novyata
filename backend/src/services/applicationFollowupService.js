import ApiError from '../utils/ApiError.js'
import { AI_FEATURES } from '../config/plans.js'
import { requestStructuredOutput } from './openAiClient.js'

const schema = { type: 'object', additionalProperties: false, properties: { content: { type: 'string' } }, required: ['content'] }

export function validateFollowup(value) {
  const content = typeof value?.content === 'string' ? value.content.trim() : ''
  if (content.length < 30 || content.length > 2500) throw new ApiError(502, 'Le service de relance a renvoyé une réponse invalide.')
  return { content }
}

export async function generateFollowup(context, { onRequestStart } = {}) {
  const instructions = context.kind === 'thank_you'
    ? 'Rédige en français un message de remerciement très court après entretien. Utilise seulement le contexte fourni. N’invente jamais le nom du recruteur, un échange, une date, une promesse ou un fait sur l’entreprise. Réponds uniquement au JSON demandé.'
    : 'Rédige en français une relance e-mail courte, professionnelle et prudente. N’invente jamais le nom du recruteur, un échange, une date, une promesse ou un fait sur l’entreprise. Utilise seulement le contexte fourni. Réponds uniquement au JSON demandé.'
  return requestStructuredOutput({
    feature: AI_FEATURES.APPLICATION_FOLLOWUP,
    onRequestStart,
    instructions,
    input: context,
    schema,
    schemaName: 'application_followup',
    errors: {
      provider: 'Le service de relance est temporairement indisponible.',
      timeout: 'La génération de relance a expiré.',
      invalid: 'Le service de relance a renvoyé une réponse invalide.',
      incomplete: 'Le service de relance a renvoyé une réponse incomplète.',
    },
    validate: validateFollowup,
  })
}
