import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../../store/AuthContext', () => ({ useAuth: vi.fn() }))

import { useAuth } from '../../store/AuthContext'
import HomeFooter from './HomeFooter'
import HomeHeader from './HomeHeader'

function renderNavigation() {
  return render(<MemoryRouter><HomeHeader /><HomeFooter /></MemoryRouter>)
}

describe('home navigation', () => {
  afterEach(cleanup)

  it('shows connection links for visitors', () => {
    useAuth.mockReturnValue({ isAuthenticated: false })
    renderNavigation()

    expect(screen.getAllByRole('link', { name: 'Connexion' })).toHaveLength(2)
    expect(screen.getByRole('link', { name: 'Créer mon CV' }).getAttribute('href')).toBe('/inscription')
  })

  it('hides connection links and directs authenticated users to their dashboard', () => {
    useAuth.mockReturnValue({ isAuthenticated: true })
    renderNavigation()

    expect(screen.queryByRole('link', { name: 'Connexion' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Mon espace' }).getAttribute('href')).toBe('/dashboard')
  })
})
