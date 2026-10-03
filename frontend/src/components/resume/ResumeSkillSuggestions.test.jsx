import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../services/resumeService', () => ({ createSkill: vi.fn() }))
import { createSkill } from '../../services/resumeService'
import ResumeSkillSuggestions, { findExperienceSkillSuggestions } from './ResumeSkillSuggestions'

afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('resume skill suggestions', () => {
  it('only suggests catalog skills mentioned multiple times and not already listed', () => {
    const suggestions = findExperienceSkillSuggestions([
      { job_title: 'Intégratrice React', description: 'Développement React et JavaScript.' },
      { job_title: 'Développeuse', description: 'Composants React, tests JavaScript.' },
      { job_title: 'Designer', description: 'Utilisation de Figma.' },
    ], [{ name: 'JavaScript' }])
    expect(suggestions).toContainEqual({ name: 'React', count: 3 })
    expect(suggestions.some(({ name }) => name === 'JavaScript')).toBe(false)
    expect(suggestions.some(({ name }) => name === 'Figma')).toBe(false)
  })

  it('requires the user to add or ignore the suggestion explicitly', async () => {
    const setSkills = vi.fn()
    createSkill.mockResolvedValue({ skill: { id_skill: 'skill-1', name: 'React', level: '' } })
    render(<ResumeSkillSuggestions resumeId="resume-1" experiences={[{ description: 'React et React.' }]} skills={[]} setSkills={setSkills} />)
    expect(screen.getByText(/À ajouter uniquement si/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }))
    await waitFor(() => expect(createSkill).toHaveBeenCalledWith('resume-1', { name: 'React', level: '' }))
    expect(setSkills).toHaveBeenCalled()
    expect(screen.queryByText(/React apparaît/)).toBeNull()
  })

  it('lets the user dismiss a suggestion without changing the CV', () => {
    const setSkills = vi.fn()
    render(<ResumeSkillSuggestions resumeId="resume-1" experiences={[{ description: 'React et React.' }]} skills={[]} setSkills={setSkills} />)
    fireEvent.click(screen.getByRole('button', { name: 'Ignorer' }))
    expect(setSkills).not.toHaveBeenCalled()
    expect(screen.queryByRole('heading', { name: 'Des compétences citées dans vos expériences' })).toBeNull()
  })
})
