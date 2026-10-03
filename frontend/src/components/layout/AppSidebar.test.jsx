import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../../store/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('../../services/notificationService', () => ({ getNotifications: vi.fn() }))

import { useAuth } from '../../store/AuthContext'
import { getNotifications } from '../../services/notificationService'
import AppSidebar from './AppSidebar'

describe('AppSidebar', () => {
  afterEach(cleanup)

  it('provides an accessible way back to the home page and closes the drawer', async () => {
    const onNavigate = vi.fn()
    useAuth.mockReturnValue({ user: { first_name: 'Marie', last_name: 'Laurent', email: 'marie@example.com' }, logout: vi.fn() })
    getNotifications.mockResolvedValue({ unreadCount: 2 })

    render(<MemoryRouter><AppSidebar isOpen onNavigate={onNavigate} /></MemoryRouter>)

    expect(await screen.findByRole('link', { name: 'Notifications, 2 non lues' })).toBeTruthy()
    const homeLink = screen.getByRole('link', { name: 'Accueil' })
    expect(homeLink.getAttribute('href')).toBe('/')
    fireEvent.click(homeLink)
    expect(onNavigate).toHaveBeenCalledOnce()
  })
})
