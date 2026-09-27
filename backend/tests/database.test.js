import { afterEach, describe, expect, it, vi } from 'vitest'

const { poolConstructor } = vi.hoisted(() => ({ poolConstructor: vi.fn() }))

vi.mock('pg', () => ({ default: { Pool: poolConstructor } }))

describe('database configuration', () => {
  afterEach(() => {
    delete process.env.DATABASE_URL
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('keeps the pool null and throws a clear error without DATABASE_URL', async () => {
    const { pool, requireDatabase } = await import('../src/config/database.js')
    expect(pool).toBeNull()
    expect(() => requireDatabase()).toThrow('DATABASE_URL est requis')
  })

  it('creates and returns a secure pool when DATABASE_URL is configured', async () => {
    const fakePool = { query: vi.fn() }
    poolConstructor.mockImplementation(function Pool() {
      return fakePool
    })
    process.env.DATABASE_URL = 'postgresql://example'
    const { pool, requireDatabase } = await import('../src/config/database.js')
    expect(poolConstructor).toHaveBeenCalledWith({ connectionString: 'postgresql://example', ssl: { rejectUnauthorized: false } })
    expect(pool).toBe(fakePool)
    expect(requireDatabase()).toBe(fakePool)
  })
})
