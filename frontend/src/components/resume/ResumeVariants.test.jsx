import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../services/resumeService', () => ({ createResumeVariant: vi.fn() }))
import { createResumeVariant } from '../../services/resumeService'
import ResumeVariants from './ResumeVariants'

afterEach(() => { cleanup(); vi.clearAllMocks() })
function CurrentPath() { return <output data-testid="path">{useLocation().pathname}</output> }
const resume = { id_resume: 'resume-original', title_resume: 'CV principal', variants: [] }

describe('ResumeVariants', () => {
  it('offers an upgrade instead of variant creation to Free users', () => {
    render(<MemoryRouter><ResumeVariants resume={resume} plan="free" /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'Découvrir Pro' }).getAttribute('href')).toBe('/tarifs')
    expect(screen.queryByRole('button', { name: 'Créer une variante' })).toBeNull()
  })

  it('creates a separate copy and opens that variant for Pro users', async () => {
    createResumeVariant.mockResolvedValue({ resume: { id_resume: 'resume-variant' } })
    render(<MemoryRouter><ResumeVariants resume={resume} plan="pro" /><CurrentPath /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText('Nom de la nouvelle variante'), { target: { value: 'Version React' } })
    fireEvent.click(screen.getByRole('button', { name: 'Créer une variante' }))
    await waitFor(() => expect(createResumeVariant).toHaveBeenCalledWith('resume-original', 'Version React'))
    await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('/cv/resume-variant'))
  })
})
