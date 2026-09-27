import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('../../store/AuthContext', () => ({ useAuth: vi.fn() }))

import { useAuth } from '../../store/AuthContext'
import PrivateRoute from './PrivateRoute'

function renderPrivateRoute() {
  return render(<MemoryRouter initialEntries={['/dashboard']}><Routes><Route element={<PrivateRoute />}><Route path="/dashboard" element={<p>Zone privée</p>} /></Route><Route path="/connexion" element={<p>Connexion</p>} /></Routes></MemoryRouter>)
}

describe('PrivateRoute', () => {
  afterEach(cleanup)

  it('redirects anonymous visitors to login', () => {
    useAuth.mockReturnValue({ isAuthenticated: false, isLoading: false })
    renderPrivateRoute()
    expect(screen.getByText('Connexion')).toBeTruthy()
  })

  it('renders children for authenticated users', () => {
    useAuth.mockReturnValue({ isAuthenticated: true, isLoading: false })
    renderPrivateRoute()
    expect(screen.getByText('Zone privée')).toBeTruthy()
  })

  it('waits while restoring the saved session', () => {
    useAuth.mockReturnValue({ isAuthenticated: false, isLoading: true })
    renderPrivateRoute()
    expect(screen.getByText('Vérification de votre session…')).toBeTruthy()
  })
})
