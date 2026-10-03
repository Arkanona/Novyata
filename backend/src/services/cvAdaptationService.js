import ApiError from '../utils/ApiError.js'
import { AI_FEATURES } from '../config/plans.js'
import { requestStructuredOutput } from './openAiClient.js'
import { createAnalysisResumeContext } from './jobAnalysisService.js'

const proposalSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    id: { type: 'string' },
    field: { type: 'string', enum: ['summary', 'experience'] },
    targetIndex: { type: 'integer', minimum: 0 },
    proposedText: { type: 'string' },
    reason: { type: 'string' },
  },
  required: ['id', 'field', 'targetIndex', 'proposedText', 'reason'],
}

const adaptationSchema = {
  type: 'object', additionalProperties: false,
  properties: { proposals: { type: 'array', items: proposalSchema } },
  required: ['proposals'],
}

const cleanText = (value) => typeof value === 'string' ? value.trim() : ''
const isDevelopment = () => process.env.NODE_ENV !== 'production'

function invalidAdaptation(field, expected, received) {
  if (isDevelopment()) console.error('Invalid CV adaptation:', {
    field,
    expected,
    receivedType: Array.isArray(received) ? 'array' : typeof received,
    receivedLength: typeof received === 'string' ? received.length : Array.isArray(received) ? received.length : undefined,
  })
  throw new ApiError(502, 'Le service d’adaptation a renvoyé une réponse invalide.')
}

function outputText(response) {
  if (typeof response.output_text === 'string') return response.output_text
  return response.output?.flatMap((item) => item.content || []).filter((item) => item.type === 'output_text').map((item) => item.text).join('') || ''
}

function sourceText(resume, field, targetIndex) {
  if (field === 'summary') return targetIndex === 0 ? resume.summary || '' : null
  return resume.experiences?.[targetIndex]?.description || null
}

function compactAnalysis(analysis = {}) {
  return {
    strongMatches: analysis.strongMatches?.map(({ name }) => name).slice(0, 8) || [],
    partialMatches: analysis.partialMatches?.map(({ name }) => name).slice(0, 5) || [],
    importantMissingSkills: analysis.importantMissingSkills?.map(({ name }) => name).slice(0, 5) || [],
    importantKeywords: analysis.importantKeywords?.slice(0, 10) || [],
    suggestions: analysis.suggestions?.slice(0, 5) || [],
  }
}

export function validateAdaptation(value, resume) {
  if (!value || typeof value !== 'object' || !Array.isArray(value.proposals)) invalidAdaptation('proposals', 'an array of proposals', value?.proposals)
  if (value.proposals.length > 6) invalidAdaptation('proposals', 'at most 6 proposals', value.proposals)
  const ids = new Set()
  const targets = new Set()
  const proposals = value.proposals.map((proposal, index) => {
    if (!proposal || typeof proposal !== 'object' || Array.isArray(proposal)) invalidAdaptation(`proposals[${index}]`, 'an object', proposal)
    // currentText is reconstructed for display and comes back unchanged from
    // the editor when applying a selection. It is never trusted for updates.
    const unexpected = Object.keys(proposal).find((key) => !['id', 'field', 'targetIndex', 'currentText', 'proposedText', 'reason'].includes(key))
    if (unexpected) invalidAdaptation(`proposals[${index}].${unexpected}`, 'no additional properties', proposal[unexpected])
    const id = cleanText(proposal.id)
    const field = proposal.field
    const targetIndex = proposal.targetIndex
    const proposedText = cleanText(proposal.proposedText)
    const reason = cleanText(proposal.reason)
    const target = `${field}:${targetIndex}`
    const currentText = sourceText(resume, field, targetIndex)
    if (!id) invalidAdaptation(`proposals[${index}].id`, 'a non-empty string', proposal.id)
    if (id.length > 60) invalidAdaptation(`proposals[${index}].id`, 'at most 60 characters', proposal.id)
    if (!['summary', 'experience'].includes(field)) invalidAdaptation(`proposals[${index}].field`, 'summary or experience', field)
    if (!Number.isInteger(targetIndex) || targetIndex < 0) invalidAdaptation(`proposals[${index}].targetIndex`, 'a non-negative integer', targetIndex)
    if (!currentText) invalidAdaptation(`proposals[${index}].targetIndex`, 'an existing editable CV field', targetIndex)
    if (!proposedText) invalidAdaptation(`proposals[${index}].proposedText`, 'a non-empty string', proposal.proposedText)
    if (proposedText.length > 2000) invalidAdaptation(`proposals[${index}].proposedText`, 'at most 2000 characters', proposal.proposedText)
    if (!reason) invalidAdaptation(`proposals[${index}].reason`, 'a non-empty string', proposal.reason)
    if (reason.length > 180) invalidAdaptation(`proposals[${index}].reason`, 'at most 180 characters', proposal.reason)
    if (ids.has(id)) invalidAdaptation(`proposals[${index}].id`, 'a unique ID', id)
    if (targets.has(target)) invalidAdaptation(`proposals[${index}]`, 'one proposal per editable field', target)
    // A no-op proposal is harmless. It is omitted instead of turning an
    // otherwise usable AI response into a 502.
    if (currentText === proposedText) return null
    ids.add(id); targets.add(target); return { id, field, targetIndex, currentText, proposedText, reason }
  }).filter(Boolean)
  return { proposals }
}

export async function proposeCvAdaptation({ resume, analysis, jobDescription, onRequestStart }) {
  const context = createAnalysisResumeContext(resume)
  const editable = {
    summary: resume.summary || '',
    experiences: (resume.experiences || []).map((experience, index) => ({ targetIndex: index, description: experience.description || '', jobTitle: experience.job_title || '', company: experience.company || '' })),
  }
  return requestStructuredOutput({
    feature: AI_FEATURES.CV_ADAPTATION,
    plan: 'pro',
    onRequestStart,
    instructions: 'Propose au plus 6 reformulations ciblées pour cette offre. Utilise uniquement les faits fournis : n’invente aucune expérience, compétence, technologie, diplôme, résultat ou responsabilité. Modifie seulement summary ou description d’expérience. field et targetIndex désignent le champ modifiable ; ne renvoie pas currentText. reason courte. Réponds au JSON conforme au schéma.',
    input: `CV utile :\n${JSON.stringify(context)}\n\nChamps modifiables :\n${JSON.stringify(editable)}\n\nAnalyse sauvegardée :\n${JSON.stringify(compactAnalysis(analysis))}\n\nOffre :\n${jobDescription}`,
    schema: adaptationSchema,
    schemaName: 'cv_adaptation',
    errors: {
      provider: 'Le service d’adaptation est temporairement indisponible.',
      timeout: 'Le service d’adaptation a expiré. Réessayez dans quelques instants.',
      invalid: 'Le service d’adaptation a renvoyé une réponse invalide.',
      incomplete: 'Le service d’adaptation a renvoyé une réponse incomplète.',
    },
    validate: (value) => validateAdaptation(value, resume),
  })
}
