import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../store/AuthContext', () => ({ useAuth: vi.fn() }))

import { useAuth } from '../store/AuthContext'
import AuthPage from './AuthPage'

function renderPage(mode = 'signup') {
  return render(<MemoryRouter><AuthPage mode={mode} /></MemoryRouter>)
}

function fillSignupForm() {
  fireEvent.change(screen.getByLabelText('Prénom'), { target: { value: 'Marie' } })
  fireEvent.change(screen.getByLabelText('Nom'), { target: { value: 'Laurent' } })
  fireEvent.change(screen.getByLabelText('Adresse e-mail'), { target: { value: 'marie@example.com' } })
  fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: 'Password123' } })
}

describe('AuthPage', () => {
  beforeEach(() => {
    useAuth.mockReturnValue({ isAuthenticated: false, login: vi.fn(), register: vi.fn() })
  })
  afterEach(cleanup)

  it('blocks registration when password confirmation differs', () => {
    renderPage()
    fillSignupForm()
    fireEvent.change(screen.getByLabelText('Confirmer le mot de passe'), { target: { value: 'DifferentPassword' } })
    fireEvent.click(screen.getByRole('button', { name: /créer mon compte/i }))
    expect(screen.getByText('Les mots de passe ne correspondent pas.')).toBeTruthy()
    expect(useAuth().register).not.toHaveBeenCalled()
  })

  it('submits valid registration data to the auth store', async () => {
    const register = vi.fn().mockResolvedValue({})
    useAuth.mockReturnValue({ isAuthenticated: false, login: vi.fn(), register })
    renderPage()
    fillSignupForm()
    fireEvent.change(screen.getByLabelText('Confirmer le mot de passe'), { target: { value: 'Password123' } })
    fireEvent.click(screen.getByRole('button', { name: /créer mon compte/i }))
    await waitFor(() => expect(register).toHaveBeenCalledWith({ first_name: 'Marie', last_name: 'Laurent', email: 'marie@example.com', password: 'Password123' }))
  })

  it('reveals and masks the password on demand', () => {
    renderPage('login')
    const password = screen.getByLabelText('Mot de passe')
    expect(password.type).toBe('password')
    fireEvent.click(screen.getByRole('button', { name: 'Afficher le mot de passe' }))
    expect(password.type).toBe('text')
    fireEvent.click(screen.getByRole('button', { name: 'Masquer le mot de passe' }))
    expect(password.type).toBe('password')
  })
})
