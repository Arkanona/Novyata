import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
vi.mock('../store/AuthContext', () => ({ useAuth: vi.fn() }))
import { useAuth } from '../store/AuthContext'
import FeaturesPage from './FeaturesPage'
import ModelsPage from './ModelsPage'
import PricingPage from './PricingPage'

function renderPage(Page) { useAuth.mockReturnValue({ isAuthenticated: false }); return render(<MemoryRouter><Page /></MemoryRouter>) }
describe('public marketing pages', () => {
  afterEach(cleanup)
  it('presents the actual product functions on the dedicated page', () => { renderPage(FeaturesPage); expect(screen.getByRole('heading', { name: /Les bons outils/i })).toBeTruthy(); expect(screen.getByRole('heading', { name: 'Analyse d’offre' })).toBeTruthy(); expect(screen.getByRole('link', { name: /Créer mon CV gratuitement/i })).toBeTruthy() })
  it('shows three real CV model previews and a usable CTA', () => { renderPage(ModelsPage); expect(screen.getByRole('heading', { name: 'Classique' })).toBeTruthy(); expect(screen.getByRole('heading', { name: 'Moderne' })).toBeTruthy(); expect(screen.getByRole('heading', { name: 'Minimal' })).toBeTruthy(); expect(screen.getAllByRole('button', { name: /Utiliser ce modèle/i })).toHaveLength(3) })
  it('compares Free and Pro with accessible pricing information', () => { renderPage(PricingPage); expect(screen.getByRole('table', { name: /Comparatif des plans/i })).toBeTruthy(); expect(screen.getByText('Novyata Free')).toBeTruthy(); expect(screen.getByText('Novyata Pro')).toBeTruthy(); expect(screen.getByRole('button', { name: 'Passer à Pro' })).toBeTruthy() })
})
