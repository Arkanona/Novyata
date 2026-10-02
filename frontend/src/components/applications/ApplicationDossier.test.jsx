import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../../store/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('../../services/applicationService', () => Object.fromEntries([
  'addApplicationNote', 'completeInterviewSimulation', 'createApplicationFollowup', 'createApplicationInterview',
  'createInterviewPreparation', 'createInterviewSimulation', 'createThankYouMessage', 'getApplicationDossier',
  'markApplicationFollowupSent', 'updateApplicationFollowup', 'updateApplicationInterview',
].map((name) => [name, vi.fn()])))

import * as applicationService from '../../services/applicationService'
import { useAuth } from '../../store/AuthContext'
import ApplicationDossier from './ApplicationDossier'

afterEach(() => { cleanup(); vi.clearAllMocks() })

const dossier = { checklist: [], events: [], followups: [], interviews: [{ id_interview: 'interview-1', interview_type: 'Visio' }], interview_sessions: [] }
const renderDossier = () => render(<MemoryRouter><ApplicationDossier id="application-1" /></MemoryRouter>)

describe('ApplicationDossier plan capabilities', () => {
  it('keeps the basic follow-up available to Free and explains Pro-only extras', async () => {
    useAuth.mockReturnValue({ user: { plan: 'free' } })
    applicationService.getApplicationDossier.mockResolvedValue(dossier)
    renderDossier()
    expect(await screen.findByRole('button', { name: 'Préparer une relance' })).toBeTruthy()
    expect(screen.getByText(/Deuxième relance, relance après entretien et remerciements/)).toBeTruthy()
    expect(screen.queryByRole('combobox', { name: 'Type de relance' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Générer un remerciement' })).toBeNull()
  })

  it('shows STAR coaching and advanced follow-up controls to Pro', async () => {
    useAuth.mockReturnValue({ user: { plan: 'pro' } })
    applicationService.getApplicationDossier.mockResolvedValue(dossier)
    applicationService.createInterviewSimulation.mockResolvedValue({
      simulation: { question: 'Décrivez une situation de collaboration.', feedback: { positives: ['Contexte précis'], missing: 'Résultat à expliciter.', suggestion: 'Ajoutez un résultat réel.', starAdvice: 'Précisez la situation, votre tâche et les actions engagées.' } },
      session: { id_interview_session: 'session-1', status: 'in_progress', exchanges: [], progress: 1 },
    })
    renderDossier()
    await screen.findByRole('button', { name: 'Démarrer la simulation' })
    expect(screen.getByRole('combobox', { name: 'Type de relance' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Générer un remerciement' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Démarrer la simulation' }))
    await waitFor(() => expect(screen.getByText('Précisez la situation, votre tâche et les actions engagées.')).toBeTruthy())
    expect(applicationService.createInterviewSimulation).toHaveBeenCalledWith('application-1', { sessionId: undefined, answer: '' })
  })
})
