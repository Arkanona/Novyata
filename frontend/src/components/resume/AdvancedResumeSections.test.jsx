import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../services/resumeService', () => ({
  createCustomResumeSection: vi.fn(), updateCustomResumeSection: vi.fn(), deleteCustomResumeSection: vi.fn(), updateResumeSectionOrder: vi.fn(),
}))
import { createCustomResumeSection, updateResumeSectionOrder } from '../../services/resumeService'
import AdvancedResumeSections from './AdvancedResumeSections'

afterEach(() => { cleanup(); vi.clearAllMocks() })
const renderPanel = (props = {}) => render(<MemoryRouter><AdvancedResumeSections resumeId="resume-1" sections={[]} sectionOrder={['summary', 'experiences', 'educations', 'skills', 'languages']} onSectionsChange={vi.fn()} onOrderChange={vi.fn()} plan="pro" {...props} /></MemoryRouter>)

describe('AdvancedResumeSections', () => {
  it('keeps advanced sections locked for Free and links to pricing', () => {
    renderPanel({ plan: 'free' })
    expect(screen.getByText(/disponibles avec Novyata Pro/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Découvrir Pro' }).getAttribute('href')).toBe('/tarifs')
    expect(screen.queryByRole('button', { name: 'Ajouter une section' })).toBeNull()
  })

  it('creates and persists a custom section and adds it to section order', async () => {
    const onSectionsChange = vi.fn(); const onOrderChange = vi.fn()
    createCustomResumeSection.mockResolvedValue({ section: { id_resume_section: 'section-1', section_type: 'projects', title: 'Projets', content: 'Portfolio produit', display_order: 0 } })
    renderPanel({ onSectionsChange, onOrderChange })
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter une section' }))
    fireEvent.change(screen.getByLabelText('Titre'), { target: { value: 'Projets' } })
    fireEvent.change(screen.getByLabelText('Contenu'), { target: { value: 'Portfolio produit' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer la section' }))
    await waitFor(() => expect(createCustomResumeSection).toHaveBeenCalledWith('resume-1', expect.objectContaining({ section_type: 'projects', title: 'Projets', content: 'Portfolio produit' })))
    await waitFor(() => expect(updateResumeSectionOrder).toHaveBeenCalledWith('resume-1', ['summary', 'experiences', 'educations', 'skills', 'languages', 'custom:section-1']))
    expect(onSectionsChange).toHaveBeenCalledWith([expect.objectContaining({ id_resume_section: 'section-1' })])
    expect(onOrderChange).toHaveBeenCalledWith(expect.arrayContaining(['custom:section-1']))
  })
})
