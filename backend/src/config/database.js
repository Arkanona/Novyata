import pg from 'pg'

const { Pool } = pg

function shouldUseSsl(connectionString) {
  if (process.env.DATABASE_SSL === 'true') return true
  if (process.env.DATABASE_SSL === 'false') return false

  try {
    const url = new URL(connectionString)
    return url.searchParams.get('sslmode') === 'require' || url.hostname.endsWith('.supabase.co')
  } catch {
    return false
  }
}

function poolOptions(connectionString) {
  const options = { connectionString }
  if (shouldUseSsl(connectionString)) {
    options.ssl = { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' }
  }
  return options
}

// PostgreSQL local works without TLS, while Supabase connections keep TLS enabled.
// DATABASE_SSL may be set explicitly when a managed provider requires a different policy.
export const pool = process.env.DATABASE_URL
  ? new Pool(poolOptions(process.env.DATABASE_URL))
  : null

export function requireDatabase() {
  if (!pool) throw new Error('DATABASE_URL est requis pour accéder à la base de données.')
  return pool
}
