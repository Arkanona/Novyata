import { capabilitiesFor } from '../config/plans.js'

const freeLimits = Object.freeze({
  requirements: 4,
  strongMatches: 2,
  partialMatches: 1,
  importantMissingSkills: 2,
  optionalMissingSkills: 1,
  importantKeywords: 3,
  suggestions: 2,
})

export function presentAnalysisForPlan(analysis, plan) {
  if (capabilitiesFor(plan).advancedATS) return analysis
  return Object.fromEntries(Object.entries(analysis).map(([key, value]) => (
    Array.isArray(value) && freeLimits[key] ? [key, value.slice(0, freeLimits[key])] : [key, value]
  )))
}
