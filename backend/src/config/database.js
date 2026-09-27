import pg from 'pg'

const { Pool } = pg

// Supabase exposes a standard PostgreSQL connection string through DATABASE_URL.
// The pool is exported now so future routes can share one connection layer.
export const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : null

export function requireDatabase() {
  if (!pool) throw new Error('DATABASE_URL est requis pour accéder à la base de données.')
  return pool
}
