import { describe, expect, it } from 'vitest'
import { compactDateRange } from './templateUtils'

describe('compactDateRange', () => {
  it('keeps the dates while using the compact CV format', () => {
    expect(compactDateRange({ start_date: '2023-01-01', end_date: '2024-06-01' })).toBe('janv 2023 — juin 2024')
  })

  it('shows the current position without inventing an end date', () => {
    expect(compactDateRange({ start_date: '2024-02-01', is_current: true })).toBe('févr 2024 — Aujourd’hui')
  })
})
