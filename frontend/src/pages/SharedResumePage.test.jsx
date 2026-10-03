import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('../services/resumeShareService', () => ({ getSharedResume: vi.fn() }))
vi.mock('../components/resume/ResumePreview', () => ({ default: ({ resume }) => <section aria-label="Aperçu du CV partagé"><h1>{resume.title_resume}</h1><span>{resume.first_name} {resume.last_name}</span></section> }))
import { getSharedResume } from '../services/resumeShareService'
import SharedResumePage from './SharedResumePage'

afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('SharedResumePage', () => {
  it('renders the CV content from a bearer token, without account access', async () => {
    getSharedResume.mockResolvedValue({ resume: { title_resume: 'CV Product Designer', first_name: 'Élise', last_name: 'Durand' } })
    render(<MemoryRouter initialEntries={['/cv/share/opaque']}><Routes><Route path="/cv/share/:token" element={<SharedResumePage />} /></Routes></MemoryRouter>)
    expect((await screen.findAllByRole('heading', { name: 'CV Product Designer' })).length).toBe(2)
    expect(screen.getByText('Élise Durand')).toBeTruthy()
    expect(getSharedResume).toHaveBeenCalledWith('opaque')
  })

  it('communicates revoked or expired links clearly', async () => {
    getSharedResume.mockRejectedValue(new Error('CV partagé introuvable ou indisponible.'))
    render(<MemoryRouter initialEntries={['/cv/share/revoked']}><Routes><Route path="/cv/share/:token" element={<SharedResumePage />} /></Routes></MemoryRouter>)
    expect(await screen.findByRole('heading', { name: 'Ce lien n’est plus disponible' })).toBeTruthy()
  })
})
