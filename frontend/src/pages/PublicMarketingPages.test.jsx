import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
vi.mock('../store/AuthContext', () => ({ useAuth: vi.fn() }))
import { useAuth } from '../store/AuthContext'
import FeaturesPage from './FeaturesPage'
import ModelsPage from './ModelsPage'
import PricingPage from './PricingPage'

function renderPage(Page, auth = { isAuthenticated: false }) { useAuth.mockReturnValue(auth); return render(<MemoryRouter><Page /></MemoryRouter>) }
describe('public marketing pages', () => {
  afterEach(cleanup)
  it('presents the actual product functions on the dedicated page', () => { renderPage(FeaturesPage); expect(screen.getByRole('heading', { name: /Les bons outils/i })).toBeTruthy(); expect(screen.getByRole('heading', { name: 'Analyse d’offre' })).toBeTruthy(); expect(screen.getByRole('link', { name: /Créer mon CV gratuitement/i })).toBeTruthy() })
  it('shows three real CV model previews and a usable CTA', () => { renderPage(ModelsPage); expect(screen.getByRole('heading', { name: 'Classique' })).toBeTruthy(); expect(screen.getByRole('heading', { name: 'Moderne' })).toBeTruthy(); expect(screen.getByRole('heading', { name: 'Minimal' })).toBeTruthy(); expect(screen.getAllByRole('button', { name: /Utiliser ce modèle/i })).toHaveLength(3) })
  it('compares Free and Pro with accessible pricing information', () => { renderPage(PricingPage); expect(screen.getByRole('table', { name: /Comparatif des plans/i })).toBeTruthy(); expect(screen.getByText('Novyata Free')).toBeTruthy(); expect(screen.getByText('Novyata Pro')).toBeTruthy(); expect(screen.getByRole('button', { name: 'Passer à Pro' })).toBeTruthy() })
  it('shows subscription management instead of a second Pro purchase for Pro users', () => { renderPage(PricingPage, { isAuthenticated: true, user: { plan: 'pro' } }); expect(screen.getAllByText('Plan actuel : Novyata Pro')).toHaveLength(2); expect(screen.getAllByRole('link', { name: 'Gérer mon abonnement' })).toHaveLength(1); expect(screen.getByRole('button', { name: 'Gérer mon abonnement' })).toBeTruthy(); expect(screen.queryByRole('button', { name: 'Passer à Pro' })).toBeNull() })
})
