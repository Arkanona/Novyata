import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import ResumeRepetitionHints, { findRepeatedOpenings } from './ResumeRepetitionHints'

afterEach(cleanup)

describe('ResumeRepetitionHints', () => {
  it('detects repeated sentence openings without changing descriptions', () => {
    const experiences = [{ description: 'Création de maquettes. Tests utilisateurs.' }, { description: 'Création de prototypes.' }]
    expect(findRepeatedOpenings(experiences)).toEqual([{ opening: 'création de', count: 2 }])
  })

  it('shows an optional and dismissible writing suggestion', () => {
    render(<ResumeRepetitionHints experiences={[{ description: 'Développement de pages.' }, { description: 'Développement de composants.' }]} />)
    expect(screen.getByText(/Vous pouvez varier librement/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Ignorer' }))
    expect(screen.queryByLabelText('Suggestion de rédaction')).toBeNull()
  })
})
