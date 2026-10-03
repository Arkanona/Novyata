import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'

vi.mock('../../services/resumeService', () => ({ getResumeVersions: vi.fn(), restoreResumeVersion: vi.fn(), duplicateResumeVersion: vi.fn() }))
import { duplicateResumeVersion, getResumeVersions, restoreResumeVersion } from '../../services/resumeService'
import ResumeHistory from './ResumeHistory'

afterEach(() => { cleanup(); vi.clearAllMocks() })
const resume = { id_resume: 'resume-1', title_resume: 'CV Data' }
function Location() { return <output>{useLocation().pathname}</output> }

describe('ResumeHistory', () => {
  it('does not request Pro version data for Free users and presents the upgrade path', async () => {
    render(<MemoryRouter><ResumeHistory resume={resume} plan="free" /></MemoryRouter>)
    fireEvent.click(screen.getByText('Versions enregistrées'))
    expect(await screen.findByRole('link', { name: 'Découvrir Pro' })).toBeTruthy()
    expect(getResumeVersions).not.toHaveBeenCalled()
  })

  it('loads versions and duplicates a selected version into a new CV', async () => {
    getResumeVersions.mockResolvedValue({ versions: [{ id_resume_version: 'version-1', version_label: 'Version du 01/10/2026', reason: 'Expérience modifiée', created_at: '2026-10-01T10:00:00.000Z' }] })
    duplicateResumeVersion.mockResolvedValue({ resume: { id_resume: 'resume-copy' } })
    const { container } = render(<MemoryRouter initialEntries={['/cv/resume-1']}><Routes><Route path="/cv/resume-1" element={<ResumeHistory resume={resume} plan="pro" />} /><Route path="/cv/:id" element={<Location />} /></Routes></MemoryRouter>)
    fireEvent.click(screen.getByText('Versions enregistrées'))
    expect(await screen.findByText(/Expérience modifiée ·/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Dupliquer/ }))
    await waitFor(() => expect(duplicateResumeVersion).toHaveBeenCalledWith('resume-1', 'version-1'))
    expect(await screen.findByText('/cv/resume-copy')).toBeTruthy()
    expect(container).toBeTruthy()
  })

  it('confirms before creating a restoration copy and never replaces the current CV', async () => {
    getResumeVersions.mockResolvedValue({ versions: [{ id_resume_version: 'version-restore', version_label: 'Version stable', reason: 'État actuel', created_at: '2026-10-01T10:00:00.000Z' }] })
    restoreResumeVersion.mockResolvedValue({ resume: { id_resume: 'resume-restored' } })
    vi.stubGlobal('confirm', vi.fn(() => true))
    render(<MemoryRouter><ResumeHistory resume={resume} plan="pro" /></MemoryRouter>)
    fireEvent.click(screen.getByText('Versions enregistrées'))
    fireEvent.click(await screen.findByRole('button', { name: /Restaurer comme nouveau CV/ }))
    await waitFor(() => expect(restoreResumeVersion).toHaveBeenCalledWith('resume-1', 'version-restore'))
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Le CV actuel ne sera pas remplacé'))
  })
})
