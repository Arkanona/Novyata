import { FREE_TEMPLATE_IDS, PRO_TEMPLATE_IDS } from '../components/resume/templates/templateRegistry'

export const PLAN_CAPABILITIES = Object.freeze({
  free: Object.freeze({ templates: FREE_TEMPLATE_IDS, advancedSections: false, customSectionOrder: false, advancedCustomization: false, resumeVariants: false, advancedATS: false, fullHistory: false, interviewSimulation: true, advancedInterview: false, advancedFollowups: false, advancedStatistics: false }),
  pro: Object.freeze({ templates: [...FREE_TEMPLATE_IDS, ...PRO_TEMPLATE_IDS], advancedSections: true, customSectionOrder: true, advancedCustomization: true, resumeVariants: true, advancedATS: true, fullHistory: true, interviewSimulation: true, advancedInterview: true, advancedFollowups: true, advancedStatistics: true }),
})

export function capabilitiesFor(plan) { return PLAN_CAPABILITIES[plan === 'pro' ? 'pro' : 'free'] }
export function hasPlanCapability(plan, feature) { return capabilitiesFor(plan)[feature] === true }
