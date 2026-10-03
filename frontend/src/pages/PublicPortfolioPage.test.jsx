import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('../services/portfolioService', () => ({ getPublicPortfolio: vi.fn() }))
import { getPublicPortfolio } from '../services/portfolioService'
import PublicPortfolioPage from './PublicPortfolioPage'

afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('PublicPortfolioPage', () => {
  it('renders only the visible sections returned by the public endpoint', async () => {
    getPublicPortfolio.mockResolvedValue({ portfolio: { name: 'Élise Durand', jobTitle: 'Product Designer', summary: null, experiences: [{ job_title: 'Designer UX', company: 'Studio Nova', description: 'Conception de parcours.' }], educations: [], skills: [], languages: [], customSections: [] } })
    render(<MemoryRouter initialEntries={['/p/elise-durand']}><Routes><Route path="/p/:slug" element={<PublicPortfolioPage />} /></Routes></MemoryRouter>)
    expect(await screen.findByRole('heading', { name: 'Élise Durand' })).toBeTruthy()
    expect(screen.getByText('Product Designer')).toBeTruthy()
    expect(screen.getByText('Studio Nova')).toBeTruthy()
    expect(screen.queryByText(/@/)).toBeNull()
    expect(getPublicPortfolio).toHaveBeenCalledWith('elise-durand')
  })

  it('does not disclose unpublished slugs', async () => {
    getPublicPortfolio.mockRejectedValue(new Error('Portfolio introuvable.'))
    render(<MemoryRouter initialEntries={['/p/private']}><Routes><Route path="/p/:slug" element={<PublicPortfolioPage />} /></Routes></MemoryRouter>)
    expect(await screen.findByRole('heading', { name: 'Portfolio introuvable' })).toBeTruthy()
  })
})
