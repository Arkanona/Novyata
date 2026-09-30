import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../services/resumeService', () => ({ getResumes: vi.fn() }))
vi.mock('../services/jobAnalysisService', () => ({ analyzeJobOffer: vi.fn() }))
vi.mock('../services/coverLetterGenerationService', () => ({ generateCoverLetter: vi.fn() }))
vi.mock('../services/coverLetterService', () => ({ createCoverLetter: vi.fn() }))
vi.mock('../store/AuthContext', () => ({ useAuth: vi.fn() }))

import { createCoverLetter } from '../services/coverLetterService'
import { generateCoverLetter } from '../services/coverLetterGenerationService'
import { analyzeJobOffer } from '../services/jobAnalysisService'
import { getResumes } from '../services/resumeService'
import { useAuth } from '../store/AuthContext'
import JobAnalysisPage from './JobAnalysisPage'

const resume = { id_resume: 'f8c5d2f2-6ff2-43d2-9e4f-5443200f6d4b', title_resume: 'CV Produit', first_name: 'Marie', last_name: 'Laurent', email: 'marie@example.com', job_title: 'Product Designer' }

describe('JobAnalysisPage', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks() })

  it('lets the user edit and save the generated letter in cover letters', async () => {
    useAuth.mockReturnValue({ user: { first_name: 'Marie', last_name: 'Laurent' } })
    getResumes.mockResolvedValue({ resumes: [resume] })
    analyzeJobOffer.mockResolvedValue({ analysis: { matchScore: 80, strongMatches: [{ name: 'Figma', evidence: 'Figma', reason: 'Compétence présente.' }], partialMatches: [], importantMissingSkills: [], optionalMissingSkills: [], importantKeywords: ['Produit'], suggestions: ['Mettez en avant vos projets produit.'], scoreExplanation: 'Les exigences essentielles sont majoritaires.' } })
    generateCoverLetter.mockResolvedValue({ generation: { subject: 'Candidature Product Designer', content: 'Madame, Monsieur, je souhaite vous proposer ma candidature pour ce poste de Product Designer.' } })
    createCoverLetter.mockResolvedValue({ cover_letter: { id_cover_letter: '8d11d6e9-5f59-4ed3-9c4c-cb7cc6cf8f67' } })
    render(<MemoryRouter><JobAnalysisPage /></MemoryRouter>)

    await waitFor(() => expect(screen.getByRole('option', { name: /CV Produit/ })).toBeTruthy())
    fireEvent.change(screen.getByLabelText('CV à analyser'), { target: { value: resume.id_resume } })
    fireEvent.change(screen.getByLabelText('Entreprise'), { target: { value: 'Novyata' } })
    fireEvent.change(screen.getByLabelText(/Texte de l/), { target: { value: 'Nous recherchons un Product Designer maîtrisant Figma et la recherche utilisateur.' } })
    fireEvent.click(screen.getByRole('button', { name: /Analyser l/ }))
    await waitFor(() => expect(screen.getByRole('button', { name: /Générer une lettre/ })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /Générer une lettre/ }))
    await waitFor(() => expect(screen.getByLabelText('Objet de la lettre')).toBeTruthy())
    fireEvent.change(screen.getByLabelText('Contenu de la lettre'), { target: { value: 'Madame, Monsieur, cette version a été relue et personnalisée pour votre offre.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer dans mes lettres' }))

    await waitFor(() => expect(createCoverLetter).toHaveBeenCalledWith(expect.objectContaining({ id_resume: resume.id_resume, company_name: 'Novyata', job_title: 'Product Designer', subject: 'Candidature Product Designer', content: 'Madame, Monsieur, cette version a été relue et personnalisée pour votre offre.' })))
    expect(generateCoverLetter).toHaveBeenCalledWith(expect.objectContaining({ resumeId: resume.id_resume, companyName: 'Novyata', jobTitle: 'Product Designer', analysis: expect.objectContaining({ matchScore: 80, strongMatches: [{ name: 'Figma', evidence: 'Figma', reason: 'Compétence présente.' }] }) }))
  })

  it('distinguishes skills to clarify from skills that are not mentioned', async () => {
    useAuth.mockReturnValue({ user: { first_name: 'Marie', last_name: 'Laurent' } })
    getResumes.mockResolvedValue({ resumes: [resume] })
    analyzeJobOffer.mockResolvedValue({
      analysis: {
        matchScore: 80,
        strongMatches: [{ name: 'Figma', evidence: 'Figma', reason: 'Compétence directement citée.' }],
        partialMatches: [{ name: 'Recherche utilisateur', evidence: 'Figma', reason: 'Une preuve de méthode ou de projet reste à détailler.' }],
        importantMissingSkills: [{ name: 'Jira', reason: 'Jira n’est pas présent dans le CV.' }],
        optionalMissingSkills: [{ name: 'A/B testing', reason: 'Compétence appréciée mais non indispensable.' }],
        importantKeywords: ['Produit'],
        suggestions: ['Mettez en avant vos projets produit.'],
      },
    })
    render(<MemoryRouter><JobAnalysisPage /></MemoryRouter>)

    await waitFor(() => expect(screen.getByRole('option', { name: /CV Produit/ })).toBeTruthy())
    fireEvent.change(screen.getByLabelText('CV à analyser'), { target: { value: resume.id_resume } })
    fireEvent.change(screen.getByLabelText(/Texte de l/), { target: { value: 'Offre Product Designer.' } })
    fireEvent.click(screen.getByRole('button', { name: /Analyser l/ }))

    await waitFor(() => expect(screen.getByText('Présentes mais à préciser')).toBeTruthy())
    expect(screen.getByText('Une preuve de méthode ou de projet reste à détailler.')).toBeTruthy()
    expect(screen.getByText('Jira n’est pas présent dans le CV.')).toBeTruthy()
    expect(screen.getByText('Compétence appréciée mais non indispensable.')).toBeTruthy()
  })
})
