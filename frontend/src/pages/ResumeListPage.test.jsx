import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../services/resumeService', () => ({ getResumes: vi.fn() }))

import { getResumes } from '../services/resumeService'
import ResumeListPage from './ResumeListPage'

describe('ResumeListPage', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('displays the authenticated user resumes', async () => {
    getResumes.mockResolvedValue({ resumes: [{ id_resume: 'f8c5d2f2-6ff2-43d2-9e4f-5443200f6d4b', title_resume: 'CV Produit', first_name: 'Marie', last_name: 'Laurent', job_title: 'Product Designer', updated_at: '2026-01-01' }] })
    render(<MemoryRouter><ResumeListPage /></MemoryRouter>)

    await waitFor(() => expect(screen.getByText('CV Produit')).toBeTruthy())
    expect(screen.getByRole('link', { name: /modifier/i }).getAttribute('href')).toBe('/cv/f8c5d2f2-6ff2-43d2-9e4f-5443200f6d4b')
    expect(screen.getByRole('link', { name: /importer un cv/i }).getAttribute('href')).toBe('/cv/importer')
  })
})
