import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../services/activityService', () => ({ getActivityHistory: vi.fn() }))
vi.mock('../store/AuthContext', () => ({ useAuth: vi.fn() }))
import { getActivityHistory } from '../services/activityService'
import { useAuth } from '../store/AuthContext'
import ActivityHistoryPage from './ActivityHistoryPage'

afterEach(() => { cleanup(); vi.clearAllMocks() })
const renderPage = () => render(<MemoryRouter><ActivityHistoryPage /></MemoryRouter>)

describe('ActivityHistoryPage', () => {
  it('presents the Pro upgrade and does not request history to Free users', () => {
    useAuth.mockReturnValue({ user: { plan: 'free' } })
    renderPage()
    expect(screen.getByText(/historique complet est disponible avec Novyata Pro/)).toBeTruthy()
    expect(screen.getByRole('link', { name: /Découvrir Pro/ }).getAttribute('href')).toBe('/tarifs')
    expect(getActivityHistory).not.toHaveBeenCalled()
  })

  it('loads the saved, cross-feature activity for Pro users', async () => {
    useAuth.mockReturnValue({ user: { plan: 'pro' } })
    getActivityHistory.mockResolvedValue({ activity: [{ kind: 'Analyse d’offre', id: 'a1', title: 'Novyata', subtitle: 'Product Designer', date: '2026-06-10T12:00:00Z', href: '/analyses/a1' }] })
    renderPage()
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Novyata' })).toBeTruthy())
    expect(screen.getByRole('link', { name: 'Ouvrir Novyata' }).getAttribute('href')).toBe('/analyses/a1')
  })
})
