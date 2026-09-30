import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

vi.mock('../../services/resumeService', () => ({
  createLanguage: vi.fn(), createSkill: vi.fn(), deleteLanguage: vi.fn(), deleteSkill: vi.fn(), updateLanguage: vi.fn(), updateSkill: vi.fn(),
}))

import { deleteSkill } from '../../services/resumeService'
import ResumeTags from './ResumeTags'

function Harness() {
  const [skills, setSkills] = useState([{ id_skill: 'skill-1', name: 'React', level: '' }, { id_skill: 'skill-2', name: 'JavaScript', level: '' }])
  const [languages, setLanguages] = useState([])
  return <ResumeTags resumeId="resume-1" skills={skills} languages={languages} experiences={[{ job_title: 'Développeur Web' }]} setSkills={setSkills} setLanguages={setLanguages} />
}

describe('ResumeTags', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks() })

  it('réduit puis étend la bibliothèque et filtre les compétences immédiatement', () => {
    render(<Harness />)
    expect(screen.getByText('Mes compétences')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Voir toutes les compétences' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Voir toutes les compétences' }))
    expect(screen.getByRole('button', { name: 'Réduire la liste' })).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Rechercher une compétence'), { target: { value: 'PostgreSQL' } })
    expect(screen.getByRole('button', { name: '+ PostgreSQL' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: '+ Docker' })).toBeNull()
  })

  it('supprime une compétence sélectionnée depuis Mes compétences', async () => {
    deleteSkill.mockResolvedValue(undefined)
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Retirer React' }))
    await waitFor(() => expect(deleteSkill).toHaveBeenCalledWith('resume-1', 'skill-1'))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Retirer React' })).toBeNull())
  })
})
