export const AI_FEATURES = Object.freeze({
  JOB_ANALYSIS: 'job_analysis',
  COVER_LETTER_GENERATION: 'cover_letter_generation',
  CV_ADAPTATION: 'cv_adaptation',
  APPLICATION_FOLLOWUP: 'application_followup',
  INTERVIEW_PREPARATION: 'interview_preparation',
  INTERVIEW_SIMULATION: 'interview_simulation',
})

export const PLANS = Object.freeze({
  free: { label: 'Novyata Free', quotas: { [AI_FEATURES.JOB_ANALYSIS]: 5, [AI_FEATURES.COVER_LETTER_GENERATION]: 3, [AI_FEATURES.CV_ADAPTATION]: 3, [AI_FEATURES.APPLICATION_FOLLOWUP]: 3, [AI_FEATURES.INTERVIEW_PREPARATION]: 3, [AI_FEATURES.INTERVIEW_SIMULATION]: 5 } },
  pro: { label: 'Novyata Pro', quotas: { [AI_FEATURES.JOB_ANALYSIS]: 50, [AI_FEATURES.COVER_LETTER_GENERATION]: 30, [AI_FEATURES.CV_ADAPTATION]: 30, [AI_FEATURES.APPLICATION_FOLLOWUP]: 30, [AI_FEATURES.INTERVIEW_PREPARATION]: 30, [AI_FEATURES.INTERVIEW_SIMULATION]: 60 } },
})

export function normalizePlan(plan) { return plan === 'pro' ? 'pro' : 'free' }
export function quotaFor(plan, feature) { return PLANS[normalizePlan(plan)].quotas[feature] ?? 0 }
export function currentUsagePeriod(date = new Date()) { return date.toISOString().slice(0, 7) }
export function nextUsageReset(date = new Date()) { return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)).toISOString() }
