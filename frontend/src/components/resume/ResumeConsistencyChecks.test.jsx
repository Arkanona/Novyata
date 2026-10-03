import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import ResumeConsistencyChecks, { findResumeConsistencyNotes } from './ResumeConsistencyChecks'

afterEach(cleanup)

describe('ResumeConsistencyChecks', () => {
  it('flags only review points for empty descriptions, reversed dates and a skill mismatch', () => {
    const notes = findResumeConsistencyNotes({
      summary: 'Designer produit utilisant Figma.',
      experiences: [{ job_title: 'Product Designer', description: '', start_date: '2025-01-01', end_date: '2024-01-01' }],
      educations: [], skills: [],
    })
    expect(notes.map((item) => item.message)).toEqual([
      'La description de « Product Designer » est vide. Vérifiez si vous souhaitez la compléter.',
      'Les dates de « Product Designer » semblent inversées. Vérifiez la chronologie.',
      'Le résumé mentionne Figma, mais cette compétence n’apparaît pas dans la liste. Vérifiez si vous souhaitez harmoniser les deux sections.',
    ])
  })

  it('frames findings as optional checks and leaves coherent data alone', () => {
    render(<ResumeConsistencyChecks summary="Product Designer" experiences={[{ description: 'Une expérience.' }]} skills={[]} educations={[]} />)
    expect(screen.queryByRole('heading', { name: 'Points à vérifier' })).toBeNull()
    render(<ResumeConsistencyChecks summary="Figma" experiences={[]} skills={[]} educations={[]} />)
    expect(screen.getByText(/repères, pas des erreurs certaines/)).toBeTruthy()
    expect(screen.getByText(/Rien n’est modifié automatiquement/)).toBeTruthy()
  })
})
