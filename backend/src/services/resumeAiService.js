import ApiError from '../utils/ApiError.js'
import { AI_FEATURES } from '../config/plans.js'
import { requestStructuredOutput } from './openAiClient.js'

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

export async function generateProfessionalSummary(context, { onRequestStart } = {}) {
  return requestStructuredOutput({
    feature: AI_FEATURES.RESUME_SUMMARY, onRequestStart,
    instructions: 'Rédige en français un résumé professionnel concis (2 à 4 phrases) à partir des seuls faits fournis. Ne déduis ni compétence, expérience, diplôme, résultat ni objectif absent. Retourne uniquement le JSON demandé.',
    input: context, schema: summarySchema, schemaName: 'professional_summary',
    errors: { timeout: 'La génération du résumé a expiré.', provider: 'Le service IA est temporairement indisponible.', incomplete: 'La génération du résumé a renvoyé une réponse incomplète.', invalid: 'La génération du résumé a renvoyé une réponse invalide.' },
    validate: validateProfessionalSummary,
  })
}

export async function improveProfessionalSummary(sourceText, { onRequestStart } = {}) {
  return requestStructuredOutput({
    feature: AI_FEATURES.RESUME_SUMMARY, onRequestStart,
    instructions: 'Corrige et reformule ce résumé en français pour plus de clarté et de professionnalisme. Préserve tous les faits et n’ajoute aucune compétence, expérience, qualité, diplôme ou résultat. JSON seulement.',
    input: { sourceText }, schema: summarySchema, schemaName: 'professional_summary',
    errors: { timeout: 'La reformulation a expiré.', provider: 'Le service IA est temporairement indisponible.', incomplete: 'La reformulation a renvoyé une réponse incomplète.', invalid: 'La reformulation a renvoyé une réponse invalide.' },
    validate: validateProfessionalSummary,
  })
}

export function validateExperienceImprovement(value) {
  if (!value || typeof value.description !== 'string') throw new ApiError(502, 'La proposition de reformulation est invalide.')
  const description = value.description.trim()
  if (description.length < 10 || description.length > 1200) throw new ApiError(502, 'La proposition de reformulation est invalide.')
  return { description }
}

export async function improveExperienceDescription(context, { onRequestStart } = {}) {
  return requestStructuredOutput({
    feature: AI_FEATURES.EXPERIENCE_REWRITE, onRequestStart,
    instructions: 'Reformule en français le texte d’expérience pour le rendre clair, précis et professionnel. Préserve exactement les faits source. N’ajoute aucun résultat, chiffre, responsabilité, outil ou technologie. JSON demandé seulement.',
    input: context, schema: experienceSchema, schemaName: 'experience_improvement',
    errors: { timeout: 'La reformulation a expiré.', provider: 'Le service IA est temporairement indisponible.', incomplete: 'La reformulation a renvoyé une réponse incomplète.', invalid: 'La proposition de reformulation est invalide.' },
    validate: validateExperienceImprovement,
  })
}
