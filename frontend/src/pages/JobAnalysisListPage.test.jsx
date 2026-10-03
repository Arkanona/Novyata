import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../services/jobAnalysisService', () => ({ getJobAnalyses: vi.fn(), deleteJobAnalysis: vi.fn() }))
vi.mock('../store/AuthContext', () => ({ useAuth: vi.fn() }))
import { getJobAnalyses } from '../services/jobAnalysisService'
import { useAuth } from '../store/AuthContext'
import JobAnalysisListPage from './JobAnalysisListPage'

describe('JobAnalysisListPage', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks() })

  it('requires selection of two offers before navigation to a comparison', async () => {
    useAuth.mockReturnValue({ user: { plan: 'pro' } })
    getJobAnalyses.mockResolvedValue({ job_analyses: [
      { id_job_analysis: 'one', company_name: 'Alto', job_title: 'Data Analyst', title_resume: 'CV A', match_score: 70, updated_at: '2026-05-01' },
      { id_job_analysis: 'two', company_name: 'Beta', job_title: 'Designer', title_resume: 'CV B', match_score: 60, updated_at: '2026-05-02' },
    ] })
    render(<MemoryRouter><JobAnalysisListPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByLabelText('Sélectionner Alto')).toBeTruthy())
    const compare = screen.getByRole('button', { name: 'Comparer les offres (0)' })
    expect(compare.disabled).toBe(true)
    fireEvent.click(screen.getByLabelText('Sélectionner Alto'))
    expect(screen.getByRole('button', { name: 'Comparer les offres (1)' }).disabled).toBe(true)
    fireEvent.click(screen.getByLabelText('Sélectionner Beta'))
    expect(screen.getByRole('button', { name: 'Comparer les offres (2)' }).disabled).toBe(false)
  })
})
