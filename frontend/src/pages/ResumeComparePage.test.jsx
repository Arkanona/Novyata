import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../store/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('../services/resumeService', () => ({ getResumes: vi.fn(), compareResumes: vi.fn() }))
import { useAuth } from '../store/AuthContext'
import { compareResumes, getResumes } from '../services/resumeService'
import ResumeComparePage from './ResumeComparePage'

afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('ResumeComparePage', () => {
  it('compares owned CV selections and presents before/after changes without editing', async () => {
    useAuth.mockReturnValue({ user: { plan: 'pro' } })
    getResumes.mockResolvedValue({ resumes: [{ id_resume: 'resume-a', title_resume: 'CV original' }, { id_resume: 'resume-b', title_resume: 'CV ciblé' }] })
    compareResumes.mockResolvedValue({ left: { title_resume: 'CV original', job_title: 'Designer' }, right: { title_resume: 'CV ciblé', job_title: 'Designer produit' }, diff: {
      summary: { before: 'Ancien profil', after: 'Profil adapté' },
      experiences: { added: [{ job_title: 'Designer', company: 'Studio Nova' }], removed: [], modified: [] },
      educations: { added: [], removed: [], modified: [] }, skills: { added: [{ name: 'Figma' }], removed: [], modified: [] }, languages: { added: [], removed: [], modified: [] }, customSections: { added: [], removed: [], modified: [] },
      sectionOrder: null, appearance: {},
    } })
    render(<MemoryRouter><ResumeComparePage /></MemoryRouter>)
    await screen.findByRole('button', { name: 'Comparer' })
    fireEvent.click(screen.getByRole('button', { name: 'Comparer' }))
    expect(await screen.findByRole('heading', { name: 'CV original' })).toBeTruthy()
    expect(screen.getByText('Profil adapté')).toBeTruthy()
    expect(screen.getByText(/Designer · Studio Nova/)).toBeTruthy()
    expect(screen.getByText('Figma')).toBeTruthy()
    await waitFor(() => expect(compareResumes).toHaveBeenCalledWith('resume-a', 'resume-b'))
  })

  it('requires two distinct CVs before enabling comparison', async () => {
    useAuth.mockReturnValue({ user: { plan: 'pro' } })
    getResumes.mockResolvedValue({ resumes: [{ id_resume: 'resume-a', title_resume: 'CV original' }] })
    render(<MemoryRouter><ResumeComparePage /></MemoryRouter>)
    expect((await screen.findByRole('button', { name: 'Comparer' })).disabled).toBe(true)
    expect(compareResumes).not.toHaveBeenCalled()
  })
})
