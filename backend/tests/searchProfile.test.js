import { describe, expect, it } from 'vitest'
import { compactSearchProfile } from '../src/utils/searchProfile.js'

describe('compactSearchProfile', () => {
  it('keeps only supported non-empty preferences and caps user-controlled text', () => {
    expect(compactSearchProfile({ roles: '  Data Analyst  ', location: 'Lyon', contract_type: '', secret: 'ignore', sectors: 'x'.repeat(240) })).toEqual({ roles: 'Data Analyst', location: 'Lyon', sectors: 'x'.repeat(160) })
  })

  it('returns an empty profile for missing or invalid values', () => {
    expect(compactSearchProfile(null)).toEqual({})
    expect(compactSearchProfile(['Lyon'])).toEqual({})
  })
})
