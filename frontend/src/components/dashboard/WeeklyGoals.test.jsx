import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../services/weeklyGoalService', () => ({ getWeeklyGoal: vi.fn(), saveWeeklyGoal: vi.fn() }))
import { getWeeklyGoal, saveWeeklyGoal } from '../../services/weeklyGoalService'
import WeeklyGoals from './WeeklyGoals'

afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('WeeklyGoals', () => {
  it('lets the user opt in, adjust goals and see descriptive progress', async () => {
    getWeeklyGoal.mockResolvedValue({ goal: { is_enabled: false, target_applications: 5, target_followups: 2, target_interviews: 1 }, progress: { applications: 3, followups: 1, interviews: 0 } })
    saveWeeklyGoal.mockResolvedValue({ goal: { is_enabled: true, target_applications: 4, target_followups: 2, target_interviews: 1 }, progress: { applications: 3, followups: 1, interviews: 0 } })
    render(<WeeklyGoals />)
    fireEvent.click(await screen.findByLabelText('Activer mes objectifs hebdomadaires'))
    fireEvent.change(screen.getByLabelText('Candidatures cette semaine'), { target: { value: '4' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer mes objectifs' }))
    await waitFor(() => expect(saveWeeklyGoal).toHaveBeenCalledWith({ is_enabled: true, target_applications: 4, target_followups: 2, target_interviews: 1 }))
    expect(await screen.findByText('3 / 4')).toBeTruthy()
    expect(screen.getByText(/sans classement/)).toBeTruthy()
  })

  it('keeps the widget unobtrusive when disabled and can turn it off', async () => {
    getWeeklyGoal.mockResolvedValue({ goal: { is_enabled: true, target_applications: 5, target_followups: 2, target_interviews: 1 }, progress: { applications: 1, followups: 0, interviews: 0 } })
    saveWeeklyGoal.mockResolvedValue({ goal: { is_enabled: false, target_applications: 5, target_followups: 2, target_interviews: 1 }, progress: { applications: 1, followups: 0, interviews: 0 } })
    render(<WeeklyGoals />)
    fireEvent.click(await screen.findByLabelText('Activer mes objectifs hebdomadaires'))
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer mes objectifs' }))
    await waitFor(() => expect(saveWeeklyGoal).toHaveBeenCalledWith(expect.objectContaining({ is_enabled: false })))
  })
})
