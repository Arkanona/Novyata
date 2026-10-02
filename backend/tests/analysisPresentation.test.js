import { describe, expect, it } from 'vitest'
import { presentAnalysisForPlan } from '../src/utils/analysisPresentation.js'

const report = {
  matchScore: 78,
  requirements: Array.from({ length: 6 }, (_, index) => ({ id: String(index) })),
  strongMatches: Array.from({ length: 5 }, (_, index) => ({ name: `Solide ${index}` })),
  partialMatches: Array.from({ length: 3 }, (_, index) => ({ name: `Partiel ${index}` })),
  importantMissingSkills: Array.from({ length: 3 }, (_, index) => ({ name: `Manque ${index}` })),
  optionalMissingSkills: Array.from({ length: 3 }, (_, index) => ({ name: `Bonus ${index}` })),
  importantKeywords: ['A', 'B', 'C', 'D', 'E', 'F'],
  suggestions: ['Un', 'Deux', 'Trois'],
  scoreExplanation: 'Le score reste inchangé.',
}

describe('analysis presentation by plan', () => {
  it('keeps all structured details for Pro', () => {
    expect(presentAnalysisForPlan(report, 'pro')).toEqual(report)
  })

  it('presents a limited but useful Free overview without changing score or stored source', () => {
    const free = presentAnalysisForPlan(report, 'free')
    expect(free.matchScore).toBe(78)
    expect(free.strongMatches).toHaveLength(2)
    expect(free.partialMatches).toHaveLength(1)
    expect(free.importantMissingSkills).toHaveLength(2)
    expect(free.optionalMissingSkills).toHaveLength(1)
    expect(free.importantKeywords).toHaveLength(3)
    expect(free.suggestions).toHaveLength(2)
    expect(free.scoreExplanation).toBe(report.scoreExplanation)
    expect(report.strongMatches).toHaveLength(5)
  })
})
