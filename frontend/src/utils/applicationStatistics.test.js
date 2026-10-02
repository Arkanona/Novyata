import { describe, expect, it } from 'vitest'
import { summarizeApplications } from './applicationStatistics'

describe('summarizeApplications', () => {
  it('returns neutral rates when there is no application', () => {
    const result = summarizeApplications([], new Date('2026-10-02T12:00:00.000Z'))
    expect(result.statistics).toEqual(expect.arrayContaining([['Candidatures envoyées', 0], ['Taux de réponse', '—'], ['Taux entretien', '—']]))
    expect(result.funnel).toEqual([['Envoyées', 0], ['Réponses', 0], ['Entretiens', 0], ['Propositions', 0]])
  })

  it('calculates descriptive counts, rates and the current month correctly', () => {
    const result = summarizeApplications([
      { status: 'Candidature envoyée', application_date: '2026-10-01' },
      { status: 'Entretien', application_date: '2026-10-02' },
      { status: 'Proposition', application_date: '2026-09-28' },
      { status: 'À postuler', application_date: '2026-10-02' }
    ], new Date('2026-10-02T12:00:00.000Z'))
    expect(result.statistics).toEqual(expect.arrayContaining([['Candidatures envoyées', 3], ['Réponses', 2], ['Entretiens', 1], ['Propositions', 1], ['Taux de réponse', '67 %'], ['Taux entretien', '33 %'], ['Ce mois-ci', 3]]))
  })
})
