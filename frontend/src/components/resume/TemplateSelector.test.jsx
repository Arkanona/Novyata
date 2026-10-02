import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TemplateSelector from './TemplateSelector'

const resume = { first_name: 'Aline', last_name: 'Martin', job_title: 'Designer produit', accent_color: '#314A67', font_size: 'normal', experiences: [], educations: [], skills: [], languages: [] }
const renderSelector = (plan, onChange = vi.fn()) => render(<MemoryRouter><TemplateSelector resume={resume} plan={plan} onChange={onChange} /></MemoryRouter>)
afterEach(cleanup)

describe('Pro template selector', () => {
  it('shows all Free and Pro templates to Free users with unlock links', () => {
    renderSelector('free')
    for (const name of ['Classique', 'Moderne', 'Minimal', 'Corporate', 'Élégant', 'Tech', 'Créatif sobre', 'Étudiant / Junior', 'Manager / Cadre']) expect(screen.getByText(name)).toBeTruthy()
    expect(screen.getAllByRole('link', { name: 'Débloquer avec Novyata Pro' })).toHaveLength(6)
    expect(screen.getAllByRole('button', { name: 'Utiliser ce modèle' })).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Modèle actuel' })).toBeTruthy()
  })

  it('does not activate a premium template for Free users', () => {
    const onChange = vi.fn()
    renderSelector('free', onChange)
    fireEvent.click(screen.getAllByRole('link', { name: 'Débloquer avec Novyata Pro' })[0])
    expect(onChange).not.toHaveBeenCalled()
  })

  it('allows Pro users to select a premium template', () => {
    const onChange = vi.fn()
    renderSelector('pro', onChange)
    const buttons = screen.getAllByRole('button', { name: 'Utiliser ce modèle' })
    expect(buttons).toHaveLength(8)
    fireEvent.click(buttons[7])
    expect(onChange).toHaveBeenCalledWith({ template_key: 'manager' })
  })
})
