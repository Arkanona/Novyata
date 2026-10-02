import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../services/applicationService', () => ({ getAdvancedApplicationStatistics: vi.fn() }))
import { getAdvancedApplicationStatistics } from '../../services/applicationService'
import AdvancedStatisticsPanel from './AdvancedStatisticsPanel'

afterEach(() => { cleanup(); vi.clearAllMocks() })

const report = {
  periodDays: 90,
  funnel: { applications: 2, responses: 1, interviews: 1, offers: 0, refusals: 0 },
  responseRate: 50,
  interviewRate: 50,
  averageResponseDelayDays: 4,
  responseDelaySampleSize: 1,
  weeklyTrend: [{ week: '2026-09-28', label: '28 sept.', applications: 2, responses: 1 }],
  outcomesByResume: [{ resumeId: 'resume-1', resumeTitle: 'CV Produit', applications: 2, responses: 1, interviews: 1, offers: 0 }],
  historyNote: 'Les délais reposent sur les changements de statut enregistrés.',
}

describe('AdvancedStatisticsPanel', () => {
  it('shows descriptive Pro funnel, weekly trend and results by resume', async () => {
    getAdvancedApplicationStatistics.mockResolvedValue(report)
    render(<AdvancedStatisticsPanel />)
    expect(await screen.findByText('Résultats observés par CV')).toBeTruthy()
    expect(screen.getByText('CV Produit')).toBeTruthy()
    expect(screen.getByText('4 j')).toBeTruthy()
    expect(screen.getByText(/sans comparaison de performance/)).toBeTruthy()
    expect(getAdvancedApplicationStatistics).toHaveBeenCalledWith(90)
  })

  it('reloads descriptive results when the selected period changes', async () => {
    getAdvancedApplicationStatistics.mockResolvedValue(report)
    render(<AdvancedStatisticsPanel />)
    await screen.findByText('Résultats observés par CV')
    fireEvent.change(screen.getByRole('combobox', { name: 'Période des statistiques' }), { target: { value: '30' } })
    await waitFor(() => expect(getAdvancedApplicationStatistics).toHaveBeenLastCalledWith(30))
  })
})
