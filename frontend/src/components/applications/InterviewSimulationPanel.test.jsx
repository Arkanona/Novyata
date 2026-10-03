import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import InterviewSimulationPanel from './InterviewSimulationPanel'

describe('InterviewSimulationPanel', () => {
  it('shows persisted Q&A history separately from the next unanswered question', () => {
    render(<InterviewSimulationPanel
      sessions={[]}
      session={{ id_interview_session: 'session-1', status: 'in_progress', exchanges: [
        { question: 'Présentez-vous.', answer: 'Je suis designer.', feedback: { positives: ['Réponse claire'], missing: '', suggestion: '', starAdvice: 'Précisez les actions réelles.' } },
        { question: 'Pourquoi ce poste ?', answer: '', feedback: null },
      ] }}
      answer="" simulation={null} loading={false} isPro
      onSessionChange={vi.fn()} onAnswerChange={vi.fn()} onStart={vi.fn()} onSubmit={(event) => event.preventDefault()} onComplete={vi.fn()}
    />)

    expect(screen.getByText('Présentez-vous.')).toBeTruthy()
    expect(screen.getByText('Je suis designer.')).toBeTruthy()
    const history = screen.getByRole('list', { name: 'Historique des questions et réponses' })
    expect(history.textContent).toContain('Réponse claire')
    expect(history.textContent).toContain('Précisez les actions réelles.')
    expect(screen.getByRole('heading', { name: 'Pourquoi ce poste ?' })).toBeTruthy()
    expect(screen.getByLabelText('Votre réponse')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Terminer la simulation' })).toBeTruthy()
  })

  it('lets the user resume a saved session and start a fresh session', () => {
    const onSessionChange = vi.fn()
    render(<InterviewSimulationPanel sessions={[{ id_interview_session: 'session-1', updated_at: '2026-05-12T10:00:00Z', status: 'completed', exchanges: [{ answer: 'oui' }] }]} session={null} simulation={null} answer="" loading={false} isPro={false} onSessionChange={onSessionChange} onAnswerChange={vi.fn()} onStart={vi.fn()} onSubmit={(event) => event.preventDefault()} onComplete={vi.fn()} />)
    fireEvent.change(screen.getByRole('combobox', { name: 'Reprendre une simulation' }), { target: { value: 'session-1' } })
    expect(onSessionChange).toHaveBeenCalledWith('session-1')
  })
})
