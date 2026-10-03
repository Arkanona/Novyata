import rateLimit from 'express-rate-limit'

const numericEnvironment = (name, fallback) => {
  const value = Number.parseInt(process.env[name], 10)
  return Number.isFinite(value) && value > 0 ? value : fallback
}

export function createAiRateLimit({ windowMs = numericEnvironment('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000), max = numericEnvironment('AI_RATE_LIMIT_MAX', 20) } = {}) {
  return rateLimit({
    windowMs, max, standardHeaders: 'draft-8', legacyHeaders: false,
    message: { error: { message: 'Trop de demandes IA. Réessayez dans quelques instants.' } },
  })
}

const aiRateLimit = createAiRateLimit()
export default aiRateLimit
