import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('../services/jobAnalysisService', () => ({ getJobAnalysis: vi.fn() }))
vi.mock('../services/resumeService', () => ({ getResume: vi.fn() }))
vi.mock('../services/cvAdaptationService', () => ({ applyCvAdaptation: vi.fn(), getCvAdaptationProposals: vi.fn() }))
vi.mock('../services/coverLetterService', () => ({ createCoverLetter: vi.fn() }))
vi.mock('../services/coverLetterGenerationService', () => ({ generateCoverLetter: vi.fn() }))
vi.mock('../store/AuthContext', () => ({ useAuth: vi.fn() }))

import { applyCvAdaptation, getCvAdaptationProposals } from '../services/cvAdaptationService'
import { getJobAnalysis } from '../services/jobAnalysisService'
import { getResume } from '../services/resumeService'
import { useAuth } from '../store/AuthContext'
import JobAnalysisDetailPage from './JobAnalysisDetailPage'

const analysisId = 'aa8dc2f2-6ff2-43d2-9e4f-5443200f6d4b'
const resumeId = 'f8c5d2f2-6ff2-43d2-9e4f-5443200f6d4b'
const proposal = { id: 'summary-1', field: 'summary', targetIndex: 0, currentText: 'Designer produit.', proposedText: 'Designer produit spécialisé dans les parcours utilisateurs.', reason: 'Met en avant une information existante.' }

describe('JobAnalysisDetailPage', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks() })

  it('displays a saved legacy analysis without requirementId fields', async () => {
    useAuth.mockReturnValue({ user: { first_name: 'Marie' } })
    getJobAnalysis.mockResolvedValue({
      job_analysis: {
        id_resume: resumeId, company_name: 'InsightFlow', job_title: 'Data Analyst', job_description: 'Offre test',
        analysis: {
          matchScore: 72, scoreExplanation: 'Correspondance partielle.',
          strongMatches: [{ name: 'Analyse de données', evidence: 'Tableaux de bord', reason: 'Expérience présente.' }],
          partialMatches: [], importantMissingSkills: [], optionalMissingSkills: [], importantKeywords: [], suggestions: [],
        },
      },
    })
    render(<MemoryRouter initialEntries={[`/analyses/${analysisId}`]}><Routes><Route path="/analyses/:id" element={<JobAnalysisDetailPage />} /></Routes></MemoryRouter>)

    await waitFor(() => expect(screen.getByText('Analyse de données')).toBeTruthy())
    expect(screen.getByText('Expérience présente.')).toBeTruthy()
  })

  it('lets the user accept one proposal and creates an adapted copy only', async () => {
    useAuth.mockReturnValue({ user: { first_name: 'Marie', plan: 'pro' } })
    getJobAnalysis.mockResolvedValue({ job_analysis: { id_resume: resumeId, company_name: 'CloudNova', job_title: 'Product Designer', job_description: 'Offre test', analysis: { matchScore: 82, scoreExplanation: 'Bon score.', strongMatches: [], partialMatches: [], importantMissingSkills: [], optionalMissingSkills: [], importantKeywords: [], suggestions: [] } } })
    getResume.mockResolvedValue({ resume: { id_resume: resumeId, summary: 'Designer produit.' } })
    getCvAdaptationProposals.mockResolvedValue({ adaptation: { proposals: [proposal] } })
    applyCvAdaptation.mockResolvedValue({ resume: { id_resume: '3e2c3d2f-6ff2-43d2-9e4f-5443200f6d4b' } })
    render(<MemoryRouter initialEntries={[`/analyses/${analysisId}`]}><Routes><Route path="/analyses/:id" element={<JobAnalysisDetailPage />} /><Route path="/cv/:id" element={<p>Éditeur du CV adapté</p>} /></Routes></MemoryRouter>)

    await waitFor(() => expect(screen.getByRole('button', { name: 'Adapter mon CV à cette offre' })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Adapter mon CV à cette offre' }))
    await waitFor(() => expect(screen.getByText('Designer produit spécialisé dans les parcours utilisateurs.')).toBeTruthy())
    expect(screen.getByText('Designer produit.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Accepter' }))
    fireEvent.click(screen.getByRole('button', { name: /Créer mon CV adapté/ }))
    await waitFor(() => expect(applyCvAdaptation).toHaveBeenCalledWith(analysisId, { proposals: [proposal], acceptedIds: ['summary-1'] }))
    await waitFor(() => expect(screen.getByText('Éditeur du CV adapté')).toBeTruthy())
  })

  it('shows a Pro explanation instead of exposing CV adaptation to Free users', async () => {
    useAuth.mockReturnValue({ user: { first_name: 'Marie', plan: 'free' } })
    getJobAnalysis.mockResolvedValue({ job_analysis: { id_resume: resumeId, company_name: 'CloudNova', analysis: { matchScore: 70, strongMatches: [], partialMatches: [], importantMissingSkills: [], optionalMissingSkills: [], importantKeywords: [], suggestions: [] } } })
    getResume.mockResolvedValue({ resume: { id_resume: resumeId } })
    render(<MemoryRouter initialEntries={[`/analyses/${analysisId}`]}><Routes><Route path="/analyses/:id" element={<JobAnalysisDetailPage />} /></Routes></MemoryRouter>)
    await waitFor(() => expect(screen.getByText(/disponibles avec Novyata Pro/)).toBeTruthy())
    expect(screen.getByRole('link', { name: 'Découvrir Pro' }).getAttribute('href')).toBe('/tarifs')
    expect(screen.queryByRole('button', { name: 'Adapter mon CV à cette offre' })).toBeNull()
  })
})
