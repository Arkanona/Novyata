import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../../services/resumeService', () => ({ updateResume: vi.fn(), createExperience: vi.fn(), updateExperience: vi.fn(), deleteExperience: vi.fn(), createEducation: vi.fn(), updateEducation: vi.fn(), deleteEducation: vi.fn(), createSkill: vi.fn(), updateSkill: vi.fn(), deleteSkill: vi.fn(), createLanguage: vi.fn(), updateLanguage: vi.fn(), deleteLanguage: vi.fn() }))
vi.mock('../../services/pdfExport', () => ({ exportResumePdf: vi.fn(), PDF_OVERFLOW_MESSAGE: 'Erreur PDF' }))
vi.mock('./ResumePreview', async () => {
  const React = await import('react')
  return { default: ({ resume, onOverflowChange }) => { React.useEffect(() => onOverflowChange(resume.font_size === 'large'), [resume.font_size, onOverflowChange]); return <div data-testid="preview" data-font-size={resume.font_size} /> } }
})

import { updateResume } from '../../services/resumeService'
import { exportResumePdf } from '../../services/pdfExport'
import ResumeEditor, { RESUME_OVERFLOW_WARNING } from './ResumeEditor'

const resume = { id_resume: 'f8c5d2f2-6ff2-43d2-9e4f-5443200f6d4b', first_name: 'Thomas', last_name: 'Bernard', job_title: 'Product Designer', email: 'thomas@example.com', template_key: 'classic', accent_color: '#314A67', font_size: 'normal', experiences: [], educations: [], skills: [], languages: [] }

describe('ResumeEditor typography and A4 overflow', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks() })

  it('saves a text-size preference and restores it from the loaded resume', async () => {
    updateResume.mockImplementation(async (_id, payload) => ({ resume: payload }))
    const { rerender } = render(<MemoryRouter><ResumeEditor resume={resume} onSaved={vi.fn()} /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Petit' }))
    await waitFor(() => expect(updateResume).toHaveBeenCalledWith(resume.id_resume, expect.objectContaining({ font_size: 'small' })))
    expect(screen.getByTestId('preview').dataset.fontSize).toBe('small')

    rerender(<MemoryRouter><ResumeEditor resume={{ ...resume, font_size: 'large' }} onSaved={vi.fn()} /></MemoryRouter>)
    await waitFor(() => expect(screen.getByTestId('preview').dataset.fontSize).toBe('large'))
  })

  it('blocks save and export while overflowing, then re-enables both with a smaller size', async () => {
    updateResume.mockImplementation(async (_id, payload) => ({ resume: payload }))
    render(<MemoryRouter><ResumeEditor resume={resume} onSaved={vi.fn()} /></MemoryRouter>)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Enregistrer' }).disabled).toBe(false))
    fireEvent.click(screen.getByRole('button', { name: 'Grand' }))
    await waitFor(() => expect(screen.getByText(RESUME_OVERFLOW_WARNING)).toBeTruthy())
    expect(screen.getByRole('button', { name: 'Enregistrer' }).disabled).toBe(true)
    expect(screen.getByRole('button', { name: 'Télécharger en PDF' }).disabled).toBe(true)
    expect(exportResumePdf).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Petit' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Enregistrer' }).disabled).toBe(false))
    expect(screen.getByRole('button', { name: 'Télécharger en PDF' }).disabled).toBe(false)
    await waitFor(() => expect(updateResume).toHaveBeenCalledWith(resume.id_resume, expect.objectContaining({ font_size: 'small' })))
  })
})
