import { describe, expect, it, vi } from 'vitest'
import ApiError from '../src/utils/ApiError.js'
import { errorHandler, notFound } from '../src/middleware/errorHandler.js'
import { createResponse } from './helpers.js'

describe('error handling', () => {
  it('creates a typed API error', () => {
    const error = new ApiError(400, 'Champ invalide.', { email: 'Invalide' })
    expect(error).toMatchObject({ statusCode: 400, message: 'Champ invalide.' })
  })

  it('formats controlled errors without leaking internals', () => {
    const res = createResponse()
    errorHandler(new ApiError(400, 'Champ invalide.', { email: 'Invalide' }), {}, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: { message: 'Champ invalide.', details: { email: 'Invalide' } } })
  })

  it('sends unknown errors as a generic 500 and logs only safe error metadata', () => {
    const res = createResponse()
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {})
    errorHandler(Object.assign(new Error('database password: secret'), { code: 'DB_ERROR' }), {}, res, vi.fn())
    expect(res.json.mock.calls[0][0].error.message).toBe('Une erreur interne est survenue.')
    expect(errorLog).toHaveBeenCalledWith('API error:', { statusCode: 500, errorName: 'Error', errorCode: 'DB_ERROR' })
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain('secret')
    errorLog.mockRestore()
  })

  it('does not include details when an API error has none', () => {
    const res = createResponse()
    errorHandler(new ApiError(401, 'Authentification requise.'), {}, res, vi.fn())
    expect(res.json).toHaveBeenCalledWith({ error: { message: 'Authentification requise.' } })
  })

  it('passes a typed 404 from the not-found middleware', () => {
    const next = vi.fn()
    notFound({}, {}, next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 404 })
  })
})
