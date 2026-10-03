import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../store/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('../services/authService', () => ({
  changePassword: vi.fn(), deleteAccount: vi.fn(), getCurrentUser: vi.fn(), resendVerification: vi.fn(),
  updateProfile: vi.fn(), updateSearchPreferences: vi.fn(),
}))
vi.mock('../services/billingService', () => ({ openCustomerPortal: vi.fn(), startProCheckout: vi.fn() }))
vi.mock('../services/usageService', () => ({ getUsage: vi.fn() }))

import { updateSearchPreferences } from '../services/authService'
import { getUsage } from '../services/usageService'
import { useAuth } from '../store/AuthContext'
import SettingsPage from './SettingsPage'

afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('SettingsPage search profile', () => {
  it('loads the saved profile and persists edits back into the authenticated user', async () => {
    const setUser = vi.fn()
    const savedPreferences = { roles: 'Data Analyst', location: 'Lyon', remote_work: 'Hybride' }
    useAuth.mockReturnValue({
      user: { first_name: 'Camille', last_name: 'Martin', email: 'camille@example.com', plan: 'free', job_search_preferences: savedPreferences },
      setUser, theme: 'light', setTheme: vi.fn(), logout: vi.fn(),
    })
    getUsage.mockResolvedValue({ usage: { features: [] } })
    updateSearchPreferences.mockResolvedValue({ user: { job_search_preferences: { ...savedPreferences, location: 'Grenoble' } } })

    render(<MemoryRouter><SettingsPage /></MemoryRouter>)
    const roles = await screen.findByLabelText('Métiers recherchés')
    expect(roles.value).toBe('Data Analyst')
    fireEvent.change(screen.getByLabelText('Localisation souhaitée'), { target: { value: 'Grenoble' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer ma recherche' }))

    await waitFor(() => expect(updateSearchPreferences).toHaveBeenCalledWith({ ...savedPreferences, location: 'Grenoble' }))
    expect(setUser).toHaveBeenCalledWith(expect.objectContaining({ job_search_preferences: expect.objectContaining({ location: 'Grenoble' }) }))
    expect((await screen.findByRole('status')).textContent).toContain('Modifications enregistrées.')
  })
})
