import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

vi.mock('../../services/resumeService', () => ({
  createEducation: vi.fn(), createExperience: vi.fn(), deleteEducation: vi.fn(), deleteExperience: vi.fn(), improveResumeExperience: vi.fn(), updateEducation: vi.fn(), updateExperience: vi.fn(),
}))

import { improveResumeExperience, updateEducation, updateExperience } from '../../services/resumeService'
import ResumeSections from './ResumeSections'

const experience = { id_experience: 'experience-1', job_title: 'Développeur Web Junior', company: 'PixelForge', city: 'Marseille', start_date: '2026-01-01', end_date: '2026-06-01', is_current: false, description: 'Développement de fonctionnalités web.' }
const education = { id_education: 'education-1', degree: 'Master Informatique', school: 'Université de Marseille', city: 'Marseille', start_date: '2023-09-01', end_date: '2025-06-01', description: '' }

function Harness() {
  const [experiences, setExperiences] = useState([experience])
  const [educations, setEducations] = useState([education])
  return <ResumeSections resumeId="resume-1" experiences={experiences} educations={educations} setExperiences={setExperiences} setEducations={setEducations} />
}

describe('ResumeSections', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks() })

  it('replie une expérience après une sauvegarde réussie et la rouvre pour modification', async () => {
    updateExperience.mockResolvedValue({ experience })
    render(<Harness />)

    expect(screen.queryByLabelText('Poste')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Modifier Développeur Web Junior' }))
    expect(screen.getByLabelText('Poste').value).toBe('Développeur Web Junior')
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer', exact: true }))

    await waitFor(() => expect(updateExperience).toHaveBeenCalled())
    await waitFor(() => expect(screen.queryByLabelText('Poste')).toBeNull())
    expect(screen.getByText('PixelForge')).toBeTruthy()
  })

  it('replie une formation après une sauvegarde réussie', async () => {
    updateEducation.mockResolvedValue({ education })
    render(<Harness />)

    fireEvent.click(screen.getByRole('button', { name: 'Modifier Master Informatique' }))
    expect(screen.getByLabelText('Diplôme / Formation').value).toBe('Master Informatique')
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer', exact: true }))

    await waitFor(() => expect(updateEducation).toHaveBeenCalled())
    await waitFor(() => expect(screen.queryByLabelText('Diplôme / Formation')).toBeNull())
    expect(screen.getByText('Université de Marseille')).toBeTruthy()
  })

  it('shows an editable experience rewrite and applies it only after explicit acceptance', async () => {
    improveResumeExperience.mockResolvedValue({ suggestion: 'Conception et livraison de fonctionnalités web pour PixelForge.' })
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Modifier Développeur Web Junior' }))
    fireEvent.click(screen.getByRole('button', { name: 'Améliorer la description' }))
    const suggestion = await screen.findByDisplayValue('Conception et livraison de fonctionnalités web pour PixelForge.')
    expect(screen.getByLabelText('Description').value).toBe('Développement de fonctionnalités web.')
    fireEvent.change(suggestion, { target: { value: 'Reformulation relue manuellement.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Utiliser cette proposition' }))
    expect(screen.getByLabelText('Description').value).toBe('Reformulation relue manuellement.')
    expect(updateExperience).not.toHaveBeenCalled()
    expect(improveResumeExperience).toHaveBeenCalledWith('resume-1', 'experience-1', experience.description)
  })
})
