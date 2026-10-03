import { createHash } from 'node:crypto'

const inFlight = new Set()
const MAX_TRACKED_REQUESTS = 10_000

/** Coalescing is intentionally limited to concurrent identical requests. The
 * monthly atomic quota remains authoritative across workers/instances. */
export default function aiRequestGuard(req, res, next) {
  if (inFlight.size >= MAX_TRACKED_REQUESTS) return next()
  const fingerprint = createHash('sha256')
    .update(`${req.auth?.sub || 'anonymous'}\n${req.method}\n${req.originalUrl}\n${JSON.stringify(req.body || {})}`)
    .digest('hex')
  if (inFlight.has(fingerprint)) {
    return res.status(409).json({ error: { message: 'Une demande identique est déjà en cours. Attendez sa réponse avant de recommencer.' } })
  }
  inFlight.add(fingerprint)
  const release = () => inFlight.delete(fingerprint)
  res.once('finish', release)
  res.once('close', release)
  return next()
}
