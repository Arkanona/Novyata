import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('../services/jobAnalysisService', () => ({ compareSavedOffers: vi.fn() }))
import { compareSavedOffers } from '../services/jobAnalysisService'
import JobOfferComparisonPage from './JobOfferComparisonPage'

describe('JobOfferComparisonPage', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks() })

  it('shows 2–3 saved analyses side by side and never invents missing facts', async () => {
    compareSavedOffers.mockResolvedValue({ offers: [
      { id: 'a', companyName: 'Alto', jobTitle: 'Data Analyst', location: 'Lyon', contractType: 'CDI', remote: '2 jours hybride', salary: '42 000 €', matchScore: 72, importantRequirements: ['SQL'], explicitBenefits: ['Mutuelle'] },
      { id: 'b', companyName: 'Beta', jobTitle: 'Analyste BI', location: '', contractType: '', remote: '', salary: '', matchScore: null, importantRequirements: [], explicitBenefits: [] },
    ] })
    render(<MemoryRouter initialEntries={['/analyses/comparer?ids=a,b']}><Routes><Route path="/analyses/comparer" element={<JobOfferComparisonPage />} /></Routes></MemoryRouter>)
    await waitFor(() => expect(screen.getAllByText('Non précisé dans l’offre').length).toBeGreaterThan(0))
    expect(screen.getByRole('columnheader', { name: 'Alto' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'Beta' })).toBeTruthy()
    expect(screen.getByText('42 000 €')).toBeTruthy()
    expect(screen.getByText('72%')).toBeTruthy()
    expect(screen.getByText('Non estimée')).toBeTruthy()
    expect(compareSavedOffers).toHaveBeenCalledWith(['a', 'b'])
  })

  it('rejects invalid selection count before calling the API', async () => {
    render(<MemoryRouter initialEntries={['/analyses/comparer?ids=a']}><Routes><Route path="/analyses/comparer" element={<JobOfferComparisonPage />} /></Routes></MemoryRouter>)
    expect((await screen.findByRole('alert')).textContent).toContain('Choisissez deux ou trois analyses')
    expect(compareSavedOffers).not.toHaveBeenCalled()
  })
})
