import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../store/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('../services/resumeService', () => ({ getResumes: vi.fn() }))
vi.mock('../services/portfolioService', () => ({ getMyPortfolio: vi.fn(), saveMyPortfolio: vi.fn() }))
import { useAuth } from '../store/AuthContext'
import { getResumes } from '../services/resumeService'
import { getMyPortfolio, saveMyPortfolio } from '../services/portfolioService'
import PortfolioSettingsPage from './PortfolioSettingsPage'

afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('PortfolioSettingsPage', () => {
  it('starts private with every section hidden and publishes only after explicit opt-in', async () => {
    useAuth.mockReturnValue({ user: { first_name: 'Élise', last_name: 'Durand' } })
    getMyPortfolio.mockResolvedValue({ profile: null, defaults: {} })
    getResumes.mockResolvedValue({ resumes: [{ id_resume: 'resume-1', title_resume: 'CV produit', job_title: 'Designer' }] })
    saveMyPortfolio.mockImplementation(async (profile) => ({ profile: { ...profile, id_resume: profile.id_resume } }))
    render(<MemoryRouter><PortfolioSettingsPage /></MemoryRouter>)
    expect((await screen.findByLabelText('Nom')).checked).toBe(false)
    expect(screen.getByLabelText('Expériences').checked).toBe(false)
    fireEvent.click(screen.getByLabelText('Nom'))
    fireEvent.click(screen.getByLabelText('Poste recherché'))
    fireEvent.click(screen.getByLabelText('Présentation'))
    fireEvent.click(screen.getByLabelText('Expériences'))
    fireEvent.click(screen.getByLabelText('Publier mon portfolio'))
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer les réglages' }))
    await waitFor(() => expect(saveMyPortfolio).toHaveBeenCalledWith(expect.objectContaining({ slug: 'elise-durand', is_published: true, visible_sections: expect.objectContaining({ name: true, experiences: true, skills: false }) })))
    expect(await screen.findByRole('link', { name: /Aperçu public/ })).toBeTruthy()
    expect(screen.getByText(/ne sont jamais affichés/)).toBeTruthy()
  })
})
