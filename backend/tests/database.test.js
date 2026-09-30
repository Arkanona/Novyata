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

  it('creates a local PostgreSQL pool without forcing SSL', async () => {
    const fakePool = { query: vi.fn() }
    poolConstructor.mockImplementation(function Pool() {
      return fakePool
    })
    process.env.DATABASE_URL = 'postgresql://localhost/novyata_dev'
    const { pool, requireDatabase } = await import('../src/config/database.js')
    expect(poolConstructor).toHaveBeenCalledWith({ connectionString: 'postgresql://localhost/novyata_dev' })
    expect(pool).toBe(fakePool)
    expect(requireDatabase()).toBe(fakePool)
  })

  it('keeps SSL for Supabase or an explicit provider requirement', async () => {
    const fakePool = { query: vi.fn() }
    poolConstructor.mockImplementation(function Pool() { return fakePool })
    process.env.DATABASE_URL = 'postgresql://postgres@db.example.supabase.co:5432/postgres'
    const { pool } = await import('../src/config/database.js')
    expect(poolConstructor).toHaveBeenCalledWith({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: true } })
    expect(pool).toBe(fakePool)
  })
})
