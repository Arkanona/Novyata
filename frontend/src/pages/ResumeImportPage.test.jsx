import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../services/resumeService', () => ({ createResumeFromImport: vi.fn(), parseResumeFile: vi.fn() }))

import { createResumeFromImport, parseResumeFile } from '../services/resumeService'
import ResumeImportPage from './ResumeImportPage'

afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('ResumeImportPage', () => {
  it('requires a separate user confirmation and sends only reviewed fields to CV creation', async () => {
    parseResumeFile.mockResolvedValue({ import: {
      format: 'pdf', title_resume: 'CV Marie Dupont', first_name: 'Marie', last_name: 'Dupont', job_title: 'Product Designer', email: 'marie@example.com', phone: '', city: '', summary: 'Designer produit avec une expérience en prototypage.',
      experiences: [], educations: [], skills: [{ name: 'Figma', level: '' }], languages: [{ name: 'Français', level: '' }], needs_review: ['experiences'], raw_text: 'Marie Dupont\nProduct Designer',
    } })
    createResumeFromImport.mockResolvedValue({ resume: { id_resume: 'resume-imported' } })
    render(<MemoryRouter><ResumeImportPage /></MemoryRouter>)

    const file = new File(['%PDF-1.7'], 'marie.pdf', { type: 'application/pdf' })
    fireEvent.change(screen.getByLabelText('Fichier du CV'), { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: 'Analyser le fichier' }))
    expect(await screen.findByRole('heading', { name: 'Relisez les informations extraites' })).toBeTruthy()
    expect(createResumeFromImport).not.toHaveBeenCalled()
    expect(screen.getByText(/Aucune donnée n’est créée avant votre confirmation/)).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Prénom'), { target: { value: 'Marie-Claire' } })
    fireEvent.change(screen.getByLabelText('Niveau'), { target: { value: 'Courant' } })
    fireEvent.click(screen.getByRole('button', { name: 'Créer mon CV à partir de cet import' }))
    await waitFor(() => expect(createResumeFromImport).toHaveBeenCalledOnce())
    const submitted = createResumeFromImport.mock.calls[0][0]
    expect(submitted.first_name).toBe('Marie-Claire')
    expect(submitted.skills).toEqual([{ name: 'Figma', level: '' }])
    expect(submitted.languages).toEqual([{ name: 'Français', level: 'Courant' }])
    expect(submitted).not.toHaveProperty('raw_text')
    expect(submitted).not.toHaveProperty('needs_review')
    expect(submitted).not.toHaveProperty('format')
  })
})
