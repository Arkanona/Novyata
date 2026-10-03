import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../../services/resumeService', () => ({ updateResume: vi.fn(), generateResumeSummary: vi.fn(), improveResumeSummary: vi.fn(), createExperience: vi.fn(), updateExperience: vi.fn(), deleteExperience: vi.fn(), createEducation: vi.fn(), updateEducation: vi.fn(), deleteEducation: vi.fn(), createSkill: vi.fn(), updateSkill: vi.fn(), deleteSkill: vi.fn(), createLanguage: vi.fn(), updateLanguage: vi.fn(), deleteLanguage: vi.fn() }))

import { generateResumeSummary, improveResumeSummary, updateResume } from '../../services/resumeService'
import ResumeEditor from './ResumeEditor'

const resume = {
  id_resume: 'f8c5d2f2-6ff2-43d2-9e4f-5443200f6d4b',
  first_name: 'Marie',
  last_name: 'Laurent',
  job_title: 'Product Designer',
  email: 'marie@example.com',
  phone: '',
  city: 'Paris',
  summary: '',
}

describe('ResumeEditor', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('shows an editable summary proposal and only applies it after explicit acceptance', async () => {
    generateResumeSummary.mockResolvedValue({ suggestion: 'Designer produit avec une expérience confirmée en conception de parcours.' })
    render(<MemoryRouter><ResumeEditor resume={resume} onSaved={vi.fn()} /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Générer un résumé' }))
    const proposal = await screen.findByDisplayValue('Designer produit avec une expérience confirmée en conception de parcours.')
    expect(screen.getByLabelText('Présentation').value).toBe('')
    fireEvent.change(proposal, { target: { value: 'Proposition relue par la personne.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Utiliser cette proposition' }))
    expect(screen.getByLabelText('Présentation').value).toBe('Proposition relue par la personne.')
    expect(screen.getByRole('status').textContent).toContain('Enregistrez le CV')
    expect(updateResume).not.toHaveBeenCalled()
  })

  it('offers an explicit, editable proofread of the current summary', async () => {
    const existing = { ...resume, summary: 'Je conçoit des interface avec Figma et réalise des tests utilisateurs.' }
    improveResumeSummary.mockResolvedValue({ suggestion: 'Je conçois des interfaces avec Figma et réalise des tests utilisateurs.' })
    render(<MemoryRouter><ResumeEditor resume={existing} onSaved={vi.fn()} /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Améliorer ce texte' }))
    expect((await screen.findByLabelText('Résumé proposé')).value).toContain('Je conçois')
    expect(screen.getByLabelText('Présentation').value).toBe(existing.summary)
    expect(improveResumeSummary).toHaveBeenCalledWith(existing.id_resume, existing.summary)
  })

  it('updates the preview immediately and saves the edited personal information', async () => {
    const onSaved = vi.fn()
    const updatedResume = { ...resume, first_name: 'Julie' }
    updateResume.mockResolvedValue({ resume: updatedResume })
    render(<MemoryRouter><ResumeEditor resume={resume} onSaved={onSaved} /></MemoryRouter>)

    fireEvent.change(screen.getByDisplayValue('Marie'), { target: { value: 'Julie' } })
    expect(screen.getByRole('heading', { name: 'Julie Laurent' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => expect(updateResume).toHaveBeenCalledWith(resume.id_resume, expect.objectContaining({ first_name: 'Julie' })))
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining(updatedResume))
    expect(screen.getByText('Modifications enregistrées.')).toBeTruthy()
  })

  it('uses the data of a newly loaded resume instead of retaining stale form values', () => {
    const { rerender } = render(<MemoryRouter><ResumeEditor resume={resume} onSaved={vi.fn()} /></MemoryRouter>)
    rerender(<MemoryRouter><ResumeEditor resume={{ ...resume, first_name: 'Sonia', city: 'Lyon' }} onSaved={vi.fn()} /></MemoryRouter>)

    expect(screen.getByDisplayValue('Sonia')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Sonia Laurent' })).toBeTruthy()
  })
})
