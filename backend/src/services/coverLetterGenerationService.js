import ApiError from '../utils/ApiError.js'
import { AI_FEATURES } from '../config/plans.js'
import { requestStructuredOutput } from './openAiClient.js'

const generationSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    subject: { type: 'string' },
    content: { type: 'string' },
  },
  required: ['subject', 'content'],
}

export function validateCoverLetterGeneration(value) {
  const subject = typeof value?.subject === 'string' ? value.subject.trim() : ''
  const content = typeof value?.content === 'string' ? value.content.trim() : ''
  if (!subject || subject.length > 255 || content.length < 20 || content.length > 12000) {
    throw new ApiError(502, 'Le service de génération a renvoyé une réponse invalide.')
  }
  return { subject, content }
}

export async function generateCoverLetter({ resume, jobDescription, companyName, jobTitle, analysis, onRequestStart }) {
  return requestStructuredOutput({
    feature: AI_FEATURES.COVER_LETTER_GENERATION,
    onRequestStart,
    instructions: 'Tu rédiges une lettre de motivation en français, professionnelle, naturelle et crédible. Utilise uniquement les éléments factuels du CV fourni et les informations de l’offre. N’invente jamais une expérience, un diplôme, une compétence, une responsabilité ou un résultat. Si une information manque, ne la suppose pas. Le contexte d’analyse sert uniquement à cibler la lettre : il ne constitue jamais une preuve d’expérience ou de compétence. Personnalise la lettre pour l’offre et mets en avant uniquement les compétences réellement présentes dans le CV. Réponds uniquement selon le schéma JSON demandé.',
    input: `CV structuré (seule source des faits sur le candidat) :\n${JSON.stringify(resume)}\n\nOffre d’emploi :\n${jobDescription}\n\nContexte de l’analyse de l’offre (à utiliser pour le ciblage, pas comme faits sur le candidat) :\n${JSON.stringify(analysis || {})}\n\nEntreprise indiquée : ${companyName || 'Non précisée'}\nPoste visé indiqué : ${jobTitle || resume.job_title || 'Non précisé'}`,
    schema: generationSchema,
    schemaName: 'cover_letter_generation',
    errors: {
      provider: 'Le service de génération est temporairement indisponible.',
      rateLimit: 'Le quota de génération est temporairement atteint. Réessayez plus tard.',
      timeout: 'Le service de génération a expiré. Réessayez dans quelques instants.',
      invalid: 'Le service de génération a renvoyé une réponse invalide.',
      incomplete: 'Le service de génération a renvoyé une réponse incomplète.',
    },
    validate: validateCoverLetterGeneration,
  })
}
