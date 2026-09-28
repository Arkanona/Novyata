import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../../store/AuthContext', () => ({ useAuth: vi.fn() }))

import { useAuth } from '../../store/AuthContext'
import AppSidebar from './AppSidebar'

describe('AppSidebar', () => {
  afterEach(cleanup)

  it('provides an accessible way back to the home page and closes the drawer', () => {
    const onNavigate = vi.fn()
    useAuth.mockReturnValue({ user: { first_name: 'Marie', last_name: 'Laurent', email: 'marie@example.com' }, logout: vi.fn() })

    render(<MemoryRouter><AppSidebar isOpen onNavigate={onNavigate} /></MemoryRouter>)

    const homeLink = screen.getByRole('link', { name: 'Accueil' })
    expect(homeLink.getAttribute('href')).toBe('/')
    fireEvent.click(homeLink)
    expect(onNavigate).toHaveBeenCalledOnce()
  })
})
