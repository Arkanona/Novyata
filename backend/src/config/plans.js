export const AI_FEATURES = Object.freeze({
  JOB_ANALYSIS: 'job_analysis',
  COVER_LETTER_GENERATION: 'cover_letter_generation',
  CV_ADAPTATION: 'cv_adaptation',
  APPLICATION_FOLLOWUP: 'application_followup',
  INTERVIEW_PREPARATION: 'interview_preparation',
  INTERVIEW_SIMULATION: 'interview_simulation',
})

export const PLANS = Object.freeze({
  free: { label: 'Novyata Free', quotas: { [AI_FEATURES.JOB_ANALYSIS]: 5, [AI_FEATURES.COVER_LETTER_GENERATION]: 3, [AI_FEATURES.CV_ADAPTATION]: 0, [AI_FEATURES.APPLICATION_FOLLOWUP]: 3, [AI_FEATURES.INTERVIEW_PREPARATION]: 3, [AI_FEATURES.INTERVIEW_SIMULATION]: 5 } },
  pro: { label: 'Novyata Pro', quotas: { [AI_FEATURES.JOB_ANALYSIS]: 50, [AI_FEATURES.COVER_LETTER_GENERATION]: 30, [AI_FEATURES.CV_ADAPTATION]: 30, [AI_FEATURES.APPLICATION_FOLLOWUP]: 30, [AI_FEATURES.INTERVIEW_PREPARATION]: 30, [AI_FEATURES.INTERVIEW_SIMULATION]: 60 } },
})

export function normalizePlan(plan) { return plan === 'pro' ? 'pro' : 'free' }
export function quotaFor(plan, feature) { return PLANS[normalizePlan(plan)].quotas[feature] ?? 0 }
export const RESUME_TEMPLATE_ACCESS = Object.freeze({ classic: 'free', modern: 'free', minimal: 'free', corporate: 'pro', elegant: 'pro', tech: 'pro', creative: 'pro', student: 'pro', manager: 'pro' })
export const FREE_ACCENT_COLORS = Object.freeze(['#314A67', '#4C627A', '#3F6B5B', '#7A4B4B', '#5B5F97', '#374151'])
export const PRO_ACCENT_COLORS = Object.freeze(['#2F6B65', '#6F5A46', '#8A5A74', '#A7633B'])
export const PLAN_CAPABILITIES = Object.freeze({
  free: Object.freeze({ templates: Object.freeze(['classic', 'modern', 'minimal']), advancedSections: false, customSectionOrder: false, advancedCustomization: false, resumeVariants: false, advancedATS: false, fullHistory: false, interviewSimulation: true, advancedInterview: false, advancedFollowups: false, advancedStatistics: false }),
  pro: Object.freeze({ templates: Object.freeze(Object.keys(RESUME_TEMPLATE_ACCESS)), advancedSections: true, customSectionOrder: true, advancedCustomization: true, resumeVariants: true, advancedATS: true, fullHistory: true, interviewSimulation: true, advancedInterview: true, advancedFollowups: true, advancedStatistics: true }),
})
export function capabilitiesFor(plan) { return PLAN_CAPABILITIES[normalizePlan(plan)] }
export function canUseResumeTemplate(plan, templateId) { return Boolean(RESUME_TEMPLATE_ACCESS[templateId] && (RESUME_TEMPLATE_ACCESS[templateId] === 'free' || normalizePlan(plan) === 'pro')) }
export function currentUsagePeriod(date = new Date()) { return date.toISOString().slice(0, 7) }
export function nextUsageReset(date = new Date()) { return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)).toISOString() }
