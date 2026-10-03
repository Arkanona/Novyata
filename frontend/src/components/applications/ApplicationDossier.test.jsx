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
    await waitFor(() => expect(screen.getByText('Décrivez une situation de collaboration.')).toBeTruthy())
    expect(applicationService.createInterviewSimulation).toHaveBeenCalledWith('application-1', { sessionId: undefined, answer: '' })
  })

  it('restores a saved session, displays persisted answers and continues that session', async () => {
    useAuth.mockReturnValue({ user: { plan: 'pro' } })
    const firstExchange = { question: 'Parlez-moi de vous.', answer: 'J’ai conçu un parcours de recherche.', feedback: { positives: ['Exemple concret'], missing: 'Préciser le résultat.', suggestion: 'Ajoutez une mesure réelle.' } }
    const savedSession = {
      id_interview_session: 'session-saved', status: 'in_progress', progress: 1, updated_at: '2026-05-12T10:00:00.000Z',
      exchanges: [firstExchange, { question: 'Comment avez-vous évalué ce parcours ?', answer: '', feedback: null }],
    }
    applicationService.getApplicationDossier.mockResolvedValue({ ...dossier, interview_sessions: [savedSession] })
    applicationService.createInterviewSimulation.mockResolvedValue({
      simulation: { question: 'Comment avez-vous évalué ce parcours ?', feedback: { positives: [], missing: '', suggestion: '' } },
      session: { ...savedSession, progress: 3, exchanges: [firstExchange, { question: 'Comment avez-vous évalué ce parcours ?', answer: 'J’ai conduit cinq tests.', feedback: { positives: [], missing: '', suggestion: '' } }, { question: 'Parlez-moi d’un défi métier.', answer: '', feedback: null }] },
    })

    renderDossier()
    fireEvent.change(await screen.findByRole('combobox', { name: 'Reprendre une simulation' }), { target: { value: 'session-saved' } })
    expect(screen.getByText('J’ai conçu un parcours de recherche.')).toBeTruthy()
    expect(screen.getByText('Parlez-moi de vous.')).toBeTruthy()
    fireEvent.change(screen.getByRole('textbox', { name: 'Votre réponse' }), { target: { value: 'J’ai conduit cinq tests.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer ma réponse' }))

    await waitFor(() => expect(applicationService.createInterviewSimulation).toHaveBeenCalledWith('application-1', { sessionId: 'session-saved', answer: 'J’ai conduit cinq tests.' }))
  })

  it('renders the categorized interview preparation and the STAR guide after generation', async () => {
    useAuth.mockReturnValue({ user: { plan: 'free' } })
    applicationService.getApplicationDossier.mockResolvedValue(dossier)
    applicationService.createInterviewPreparation.mockResolvedValue({ preparation: {
      introduction: 'Je suis designer produit et j’ai conçu des parcours numériques.',
      questions: [
        { category: 'rh', question: 'Pourquoi souhaitez-vous rejoindre cette équipe ?' },
        { category: 'technique', question: 'Comment conduisez-vous une recherche utilisateur ?' },
        { category: 'comportementale', question: 'Racontez une collaboration difficile vécue.' },
      ],
      strengths: ['Recherche utilisateur'], prepare: ['Préparer un exemple réel.'], recruiterQuestions: ['Comment travaille votre équipe ?'],
    } })
    renderDossier()
    fireEvent.click(await screen.findByRole('button', { name: 'Préparer l’entretien' }))
    expect(await screen.findByText('Je suis designer produit et j’ai conçu des parcours numériques.')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Questions RH' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Questions métier' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Questions comportementales' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: /Repère pour les exemples comportementaux/ })).toBeTruthy()
    expect(screen.getByText('Points forts à valoriser')).toBeTruthy()
    expect(screen.getByText('Comment travaille votre équipe ?')).toBeTruthy()
    expect(applicationService.createInterviewPreparation).toHaveBeenCalledWith('application-1')
  })
})
