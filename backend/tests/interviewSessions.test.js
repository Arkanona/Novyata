import { describe, expect, it } from 'vitest'
import { normalizeInterviewExchanges } from '../src/utils/interviewSessions.js'

describe('normalizeInterviewExchanges', () => {
  it('keeps correctly paired persisted answers unchanged', () => {
    const exchanges = [{ question: 'Question 1 ?', answer: 'Réponse 1', feedback: { suggestion: 'Conseil' } }, { question: 'Question 2 ?', answer: '', feedback: null }]
    expect(normalizeInterviewExchanges(exchanges)).toEqual(exchanges)
  })

  it('moves legacy answers and feedback back to the question they belong to', () => {
    const legacy = [
      { question: 'Question 1 ?', answer: '', feedback: null, created_at: '2026-01-01' },
      { question: 'Question 2 ?', answer: 'Réponse 1', feedback: { suggestion: 'Conseil 1' }, created_at: '2026-01-02' },
      { question: 'Question 3 ?', answer: 'Réponse 2', feedback: { suggestion: 'Conseil 2' }, created_at: '2026-01-03' },
    ]
    expect(normalizeInterviewExchanges(legacy)).toEqual([
      { question: 'Question 1 ?', answer: 'Réponse 1', feedback: { suggestion: 'Conseil 1' }, answered_at: '2026-01-02', created_at: '2026-01-01' },
      { question: 'Question 2 ?', answer: 'Réponse 2', feedback: { suggestion: 'Conseil 2' }, answered_at: '2026-01-03', created_at: '2026-01-02' },
      { question: 'Question 3 ?', answer: '', feedback: null, created_at: '2026-01-03' },
    ])
  })

  it('safely handles missing or malformed exchange data', () => {
    expect(normalizeInterviewExchanges()).toEqual([])
    expect(normalizeInterviewExchanges(null)).toEqual([])
  })
})
