import ApiError from '../utils/ApiError.js'
import { AI_FEATURES } from '../config/plans.js'
import { requestStructuredOutput } from './openAiClient.js'

const questionCategories = ['rh', 'technique', 'comportementale']
const limits = Object.freeze({ questions: 6, strengths: 3, prepare: 3, recruiterQuestions: 4 })

const schema = {
  type: 'object', additionalProperties: false,
  properties: {
    questions: {
      type: 'array', minItems: 3, maxItems: limits.questions,
      items: { type: 'object', additionalProperties: false, properties: { category: { type: 'string', enum: questionCategories }, question: { type: 'string' } }, required: ['category', 'question'] },
    },
    strengths: { type: 'array', items: { type: 'string' }, maxItems: limits.strengths },
    prepare: { type: 'array', items: { type: 'string' }, maxItems: limits.prepare },
    recruiterQuestions: { type: 'array', items: { type: 'string' }, maxItems: limits.recruiterQuestions },
    introduction: { type: 'string' },
  },
  required: ['questions', 'strengths', 'prepare', 'recruiterQuestions', 'introduction'],
}

function stringList(value, limit, field) {
  if (!Array.isArray(value) || value.length > limit || value.some((item) => typeof item !== 'string' || !item.trim() || item.trim().length > 300)) {
    throw new ApiError(502, `La préparation d’entretien contient une liste invalide (${field}).`)
  }
  return value.map((item) => item.trim())
}

export function validateInterviewPreparation(value) {
  if (!Array.isArray(value?.questions) || value.questions.length < questionCategories.length || value.questions.length > limits.questions) {
    throw new ApiError(502, 'Le service de préparation a renvoyé un nombre de questions invalide.')
  }
  const counts = Object.fromEntries(questionCategories.map((category) => [category, 0]))
  const questions = value.questions.map((item) => {
    if (!item || !questionCategories.includes(item.category) || typeof item.question !== 'string' || item.question.trim().length < 8 || item.question.trim().length > 280) {
      throw new ApiError(502, 'Le service de préparation a renvoyé une question invalide.')
    }
    counts[item.category] += 1
    if (counts[item.category] > 2) throw new ApiError(502, 'Le service de préparation a renvoyé trop de questions dans une catégorie.')
    return { category: item.category, question: item.question.trim() }
  })
  if (questionCategories.some((category) => counts[category] === 0)) throw new ApiError(502, 'Le service de préparation a omis une catégorie de questions.')
  if (typeof value.introduction !== 'string' || !value.introduction.trim() || value.introduction.trim().length > 700) {
    throw new ApiError(502, 'Le service de préparation a renvoyé une introduction invalide.')
  }
  return {
    questions,
    strengths: stringList(value.strengths, limits.strengths, 'forces'),
    prepare: stringList(value.prepare, limits.prepare, 'points à préparer'),
    recruiterQuestions: stringList(value.recruiterQuestions, limits.recruiterQuestions, 'questions recruteur'),
    introduction: value.introduction.trim(),
  }
}

export async function generateInterviewPreparation(context, { onRequestStart } = {}) {
  return requestStructuredOutput({
    feature: AI_FEATURES.INTERVIEW_PREPARATION,
    onRequestStart,
    instructions: 'Prépare en français une introduction et des questions RH, métier et comportementales selon le CV et l’offre. Les préférences de recherche sont des souhaits, pas des faits. N’invente aucun fait ni expérience. Pour le comportemental, invite à répondre selon Situation, Tâche, Action, Résultat sans compléter à sa place. JSON du schéma seulement.',
    input: context,
    schema,
    schemaName: 'interview_preparation',
    errors: {
      provider: 'Le service de préparation est temporairement indisponible.',
      timeout: 'La préparation a expiré.',
      invalid: 'Le service de préparation a renvoyé une réponse invalide.',
      incomplete: 'Le service de préparation a renvoyé une réponse incomplète.',
    },
    validate: validateInterviewPreparation,
  })
}
