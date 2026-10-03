import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../services/resumeShareService', () => ({ createResumeShareLink: vi.fn(), getResumeShareLinks: vi.fn(), revokeResumeShareLink: vi.fn() }))
import { createResumeShareLink, getResumeShareLinks, revokeResumeShareLink } from '../../services/resumeShareService'
import ResumeSharing from './ResumeSharing'

afterEach(() => { cleanup(); vi.clearAllMocks() })
const resume = { id_resume: 'resume-1' }

describe('ResumeSharing', () => {
  it('creates an expiring private link with contact details hidden by default', async () => {
    getResumeShareLinks.mockResolvedValue({ links: [] })
    createResumeShareLink.mockResolvedValue({ link: { id_resume_share_link: 'link-1', path: '/cv/share/' + 'A'.repeat(43), include_contact_details: false, expires_at: '2026-11-01T00:00:00Z', created_at: '2026-10-01T00:00:00Z' } })
    render(<ResumeSharing resume={resume} />)
    expect((await screen.findByLabelText('Inclure e-mail, téléphone et ville')).checked).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Créer un lien de partage' }))
    await waitFor(() => expect(createResumeShareLink).toHaveBeenCalledWith('resume-1', { expiresInDays: 30, includeContactDetails: false }))
    expect(await screen.findByRole('link', { name: 'Ouvrir le lien de partage' })).toBeTruthy()
    expect(screen.getByText(/Coordonnées masquées/)).toBeTruthy()
  })

  it('makes sensitive-sharing choice explicit and revokes an active link after confirmation', async () => {
    const link = { id_resume_share_link: 'link-2', path: '/cv/share/' + 'B'.repeat(43), include_contact_details: true, expires_at: null, created_at: '2026-10-01T00:00:00Z' }
    getResumeShareLinks.mockResolvedValue({ links: [link] })
    revokeResumeShareLink.mockResolvedValue({ link: { id_resume_share_link: 'link-2', revoked_at: '2026-10-02T00:00:00Z' } })
    vi.stubGlobal('confirm', vi.fn(() => true))
    render(<ResumeSharing resume={resume} />)
    expect(await screen.findByText(/Coordonnées incluses/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Révoquer le lien' }))
    await waitFor(() => expect(revokeResumeShareLink).toHaveBeenCalledWith('resume-1', 'link-2'))
    expect(await screen.findByText('Lien révoqué')).toBeTruthy()
  })
})
