import ApiError from '../utils/ApiError.js'
import { createAnalysisResumeContext } from './jobAnalysisService.js'

const proposalSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    id: { type: 'string' },
    field: { type: 'string', enum: ['summary', 'experience'] },
    targetIndex: { type: 'integer', minimum: 0 },
    currentText: { type: 'string' },
    proposedText: { type: 'string' },
    reason: { type: 'string' },
  },
  required: ['id', 'field', 'targetIndex', 'currentText', 'proposedText', 'reason'],
}

const adaptationSchema = {
  type: 'object', additionalProperties: false,
  properties: { proposals: { type: 'array', items: proposalSchema } },
  required: ['proposals'],
}

const cleanText = (value, maxLength) => typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
const timeout = () => {
  const value = Number.parseInt(process.env.OPENAI_TIMEOUT_MS, 10)
  return Number.isFinite(value) && value > 0 ? value : 60_000
}
const maxOutputTokens = () => {
  const value = Number.parseInt(process.env.OPENAI_MAX_OUTPUT_TOKENS, 10)
  return Number.isFinite(value) && value >= 800 ? Math.min(value, 1800) : 1800
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
  if (!value || !Array.isArray(value.proposals) || value.proposals.length > 6 || value.proposals.some((proposal) => !proposal || typeof proposal !== 'object')) throw new ApiError(502, 'Le service d’adaptation a renvoyé une réponse invalide.')
  const ids = new Set()
  const targets = new Set()
  const proposals = value.proposals.reduce((result, proposal) => {
    const id = cleanText(proposal.id, 60)
    const field = proposal.field
    const targetIndex = proposal.targetIndex
    const currentText = cleanText(proposal.currentText, 2000)
    const proposedText = cleanText(proposal.proposedText, 2000)
    const reason = cleanText(proposal.reason, 180)
    const target = `${field}:${targetIndex}`
    if (!id || !['summary', 'experience'].includes(field) || !Number.isInteger(targetIndex) || targetIndex < 0 || !currentText || !proposedText || !reason || ids.has(id) || targets.has(target) || sourceText(resume, field, targetIndex) !== currentText || currentText === proposedText) throw new ApiError(502, 'Le service d’adaptation a renvoyé une réponse invalide.')
    ids.add(id); targets.add(target); result.push({ id, field, targetIndex, currentText, proposedText, reason }); return result
  }, [])
  return { proposals }
}

export async function proposeCvAdaptation({ resume, analysis, jobDescription }) {
  if (!process.env.OPENAI_API_KEY) throw new ApiError(503, 'Le service d’adaptation IA n’est pas configuré.')
  const context = createAnalysisResumeContext(resume)
  const editable = {
    summary: resume.summary || '',
    experiences: (resume.experiences || []).map((experience, index) => ({ targetIndex: index, description: experience.description || '', jobTitle: experience.job_title || '', company: experience.company || '' })),
  }
  let response
  try {
    response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(timeout()),
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-6-luna',
        reasoning: { effort: 'low' },
        max_output_tokens: maxOutputTokens(),
        instructions: 'Propose au plus 6 reformulations ciblées d’un CV pour cette offre. Utilise uniquement les faits fournis. Ne crée aucune expérience, compétence, technologie, diplôme, résultat ni responsabilité. Modifie seulement summary ou description d’expérience. currentText doit être exactement le texte source, targetIndex désigne l’expérience (0 commence la liste) et reason est courte. Réponds uniquement au JSON conforme au schéma.',
        input: `CV utile :\n${JSON.stringify(context)}\n\nChamps modifiables :\n${JSON.stringify(editable)}\n\nAnalyse sauvegardée :\n${JSON.stringify(compactAnalysis(analysis))}\n\nOffre :\n${jobDescription}`,
        text: { verbosity: 'low', format: { type: 'json_schema', name: 'cv_adaptation', strict: true, schema: adaptationSchema } },
      }),
    })
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') throw new ApiError(504, 'Le service d’adaptation a expiré. Réessayez dans quelques instants.')
    throw new ApiError(502, 'Le service d’adaptation est temporairement indisponible.')
  }
  if (!response.ok) throw new ApiError(502, 'Le service d’adaptation est temporairement indisponible.')
  const data = await response.json()
  if (data.status === 'failed' || data.status === 'incomplete' || data.error) throw new ApiError(502, 'Le service d’adaptation a renvoyé une réponse incomplète.')
  try { return validateAdaptation(JSON.parse(outputText(data)), resume) } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(502, 'Le service d’adaptation a renvoyé une réponse invalide.')
  }
}
