import { AI_FEATURES } from './plans.js'

// Limits are for the exact JSON/string passed as Responses API `input`.
// Offer field limits are also enforced by request controllers; this final
// bound protects against unexpectedly large aggregate CV/context data.
export const AI_SETTINGS = Object.freeze({
  [AI_FEATURES.JOB_ANALYSIS]: Object.freeze({ maxInputChars: 24_000, maxRequestBytes: 80_000, maxOutputTokens: 1650 }),
  [AI_FEATURES.COVER_LETTER_GENERATION]: Object.freeze({ maxInputChars: 40_000, maxRequestBytes: 100_000, maxOutputTokens: 1400 }),
  [AI_FEATURES.CV_ADAPTATION]: Object.freeze({ maxInputChars: 60_000, maxRequestBytes: 120_000, maxOutputTokens: 1650 }),
  [AI_FEATURES.APPLICATION_FOLLOWUP]: Object.freeze({ maxInputChars: 8_000, maxRequestBytes: 16_000, maxOutputTokens: 700 }),
  [AI_FEATURES.INTERVIEW_PREPARATION]: Object.freeze({ maxInputChars: 18_000, maxRequestBytes: 60_000, maxOutputTokens: 1300 }),
  [AI_FEATURES.INTERVIEW_SIMULATION]: Object.freeze({ maxInputChars: 20_000, maxRequestBytes: 65_000, maxOutputTokens: Object.freeze({ free: 650, pro: 900 }) }),
  [AI_FEATURES.RESUME_SUMMARY]: Object.freeze({ maxInputChars: 8_000, maxRequestBytes: 24_000, maxOutputTokens: 500 }),
  [AI_FEATURES.EXPERIENCE_REWRITE]: Object.freeze({ maxInputChars: 8_000, maxRequestBytes: 24_000, maxOutputTokens: 500 }),
})

export const AI_REASONING_EFFORT = 'low'
export const AI_DEFAULT_TIMEOUT_MS = 60_000

export function aiModel(env = process.env) { return env.OPENAI_MODEL || 'gpt-6-luna' }

export function aiOutputLimit(feature, { plan = 'free', env = process.env } = {}) {
  const configured = AI_SETTINGS[feature]?.maxOutputTokens
  const defaultLimit = typeof configured === 'object' ? configured[plan === 'pro' ? 'pro' : 'free'] : configured
  if (!defaultLimit) throw new Error(`Configuration IA manquante pour ${feature}.`)
  if ([AI_FEATURES.JOB_ANALYSIS, AI_FEATURES.CV_ADAPTATION].includes(feature)) {
    const requested = Number.parseInt(env.OPENAI_MAX_OUTPUT_TOKENS, 10)
    return Number.isFinite(requested) && requested >= 800 ? Math.min(requested, defaultLimit) : defaultLimit
  }
  return defaultLimit
}

export function isAiFeatureEnabled(feature, env = process.env) {
  if (env.AI_ENABLED === 'false') return false
  const disabled = (env.AI_DISABLED_FEATURES || '').split(',').map((value) => value.trim()).filter(Boolean)
  return !disabled.includes(feature)
}

export function assertAiFeatureEnabled(feature, env = process.env) {
  if (!AI_SETTINGS[feature]) throw new Error(`Fonction IA inconnue: ${feature}.`)
  if (!isAiFeatureEnabled(feature, env)) {
    const error = new Error('Cette fonctionnalité est temporairement indisponible.')
    error.statusCode = 503
    throw error
  }
}
