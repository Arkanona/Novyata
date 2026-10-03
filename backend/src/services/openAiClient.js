import { AI_SETTINGS, AI_DEFAULT_TIMEOUT_MS, AI_REASONING_EFFORT, aiModel, aiOutputLimit, assertAiFeatureEnabled } from '../config/ai.js'
import { AI_FEATURES } from '../config/plans.js'
import ApiError from '../utils/ApiError.js'

function errorWithDispatch(error, dispatched) {
  const result = error instanceof Error ? error : new Error(String(error))
  result.aiRequestDispatched = dispatched
  return result
}

function outputText(response) {
  if (typeof response.output_text === 'string') return response.output_text
  return response.output?.flatMap((item) => item.content || []).filter((item) => item.type === 'output_text').map((item) => item.text).join('') || ''
}

function costEstimate(usage, env, model) {
  const inputPrice = Number(env.FREE_AI_INPUT_PRICE_PER_MILLION ?? (model === 'gpt-6-luna' ? 0.1 : NaN))
  const cachedPrice = Number(env.FREE_AI_CACHED_INPUT_PRICE_PER_MILLION ?? (model === 'gpt-6-luna' ? 0.01 : NaN))
  const outputPrice = Number(env.FREE_AI_OUTPUT_PRICE_PER_MILLION ?? (model === 'gpt-6-luna' ? 0.5 : NaN))
  if (![inputPrice, cachedPrice, outputPrice].every(Number.isFinite)) return null
  const inputTokens = usage?.input_tokens || 0
  const cachedTokens = Math.min(inputTokens, usage?.input_tokens_details?.cached_tokens || 0)
  const outputTokens = usage?.output_tokens || 0
  return (((inputTokens - cachedTokens) * inputPrice) + (cachedTokens * cachedPrice) + (outputTokens * outputPrice)) / 1_000_000
}

function usageDetails(usage = {}) {
  const inputTokens = Number(usage.input_tokens) || 0
  const outputTokens = Number(usage.output_tokens) || 0
  const reasoningTokens = Number(usage.output_tokens_details?.reasoning_tokens) || 0
  return { inputTokens, outputTokens, reasoningTokens, totalTokens: inputTokens + outputTokens }
}

function resolveTimeout(env) {
  const configured = Number(env.OPENAI_TIMEOUT_MS)
  return Number.isFinite(configured) && configured > 0 ? configured : AI_DEFAULT_TIMEOUT_MS
}

function logUsage({ feature, model, limit, usage, durationMs, success, env }) {
  if (env.NODE_ENV === 'production') return
  const tokens = usageDetails(usage)
  console.info('OpenAI usage:', {
    feature, model, ...tokens, maxOutputTokens: limit, durationMs,
    success, estimatedCostUsd: usage ? costEstimate(usage, env, model) : null,
  })
}

/** One Responses API request; deliberately no automatic retries. */
export async function requestStructuredOutput({
  feature, input, instructions, schema, schemaName,
  plan = 'free', onRequestStart = () => {}, env = process.env,
  timeoutMs = resolveTimeout(env),
  errors = {}, validate = (value) => value,
}) {
  try { assertAiFeatureEnabled(feature, env) } catch (error) { throw new ApiError(error.statusCode || 503, error.message) }
  if (!env.OPENAI_API_KEY) throw new ApiError(503, 'Le service IA n’est pas configuré.')

  const settings = AI_SETTINGS[feature]
  const serializedInput = typeof input === 'string' ? input : JSON.stringify(input ?? {})
  if (serializedInput.length > settings.maxInputChars) {
    throw new ApiError(413, errors.inputTooLong || 'Le contexte transmis à l’IA est trop volumineux. Réduisez les informations ou raccourcissez l’offre avant de réessayer.', { feature, maxInputChars: settings.maxInputChars })
  }

  const model = aiModel(env)
  const maxOutputTokens = aiOutputLimit(feature, { plan, env })
  const startedAt = Date.now()
  let dispatched = false
  let usage
  const fail = (message, statusCode = 502, details = null) => errorWithDispatch(new ApiError(statusCode, message, details), dispatched)
  const payload = {
    model, reasoning: { effort: AI_REASONING_EFFORT }, instructions, input: serializedInput,
    text: { format: { type: 'json_schema', name: schemaName, strict: true, schema } },
    max_output_tokens: maxOutputTokens,
  }
  const body = JSON.stringify(payload)
  if (Buffer.byteLength(body, 'utf8') > settings.maxRequestBytes) {
    throw new ApiError(413, errors.inputTooLong || 'Le CV, l’offre ou le contexte dépasse la taille maximale acceptée par l’analyse. Réduisez les informations avant de réessayer.', { feature, maxInputChars: settings.maxInputChars, maxRequestBytes: settings.maxRequestBytes })
  }
  try {
    onRequestStart()
    dispatched = true
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
      body,
    })
    if (!response.ok) {
      const isRateLimited = response.status === 429
      throw fail(isRateLimited ? (errors.rateLimit || errors.provider || 'Le service IA est temporairement indisponible.') : (errors.provider || 'Le service IA est temporairement indisponible.'), isRateLimited ? 429 : 502)
    }
    const data = await response.json()
    usage = data.usage
    if (data.status === 'incomplete' || data.incomplete_details || data.status === 'failed' || data.error) {
      if (env.NODE_ENV !== 'production' && data.incomplete_details && feature === AI_FEATURES.JOB_ANALYSIS) {
        console.warn('OpenAI analysis truncated:', { outputTokens: usage?.output_tokens || 0, maxOutputTokens, reason: data.incomplete_details.reason || 'unknown' })
      }
      throw fail(errors.incomplete || 'Le service IA a renvoyé une réponse incomplète.', 502, { reason: data.incomplete_details?.reason })
    }
    const text = outputText(data)
    let parsed
    try { parsed = JSON.parse(text) } catch { throw fail(errors.invalid || 'Le service IA a renvoyé une réponse invalide.') }
    let validated
    try { validated = validate(parsed) } catch (error) { throw errorWithDispatch(error, dispatched) }
    if (env.NODE_ENV !== 'production' && usage) logUsage({ feature, model, limit: maxOutputTokens, usage, durationMs: Date.now() - startedAt, success: true, env })
    return validated
  } catch (error) {
    const dispatchedError = errorWithDispatch(error, dispatched)
    if (env.NODE_ENV !== 'production') logUsage({ feature, model, limit: maxOutputTokens, usage, durationMs: Date.now() - startedAt, success: false, env })
    if (dispatchedError instanceof ApiError) throw dispatchedError
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') throw fail(errors.timeout || 'La requête IA a expiré. Réessayez dans quelques instants.', 504)
    throw fail(errors.provider || 'Le service IA est temporairement indisponible.')
  }
}

export function markAiErrorAsDispatched(error) { return errorWithDispatch(error, true) }
