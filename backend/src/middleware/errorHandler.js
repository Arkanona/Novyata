import ApiError from '../utils/ApiError.js'

export function notFound(req, res, next) {
  next(new ApiError(404, 'Route introuvable.'))
}

export function errorHandler(error, req, res, next) {
  const isApiError = error instanceof ApiError
  const statusCode = isApiError ? error.statusCode : 500
  const message = isApiError ? error.message : 'Une erreur interne est survenue.'

  if (statusCode >= 500) {
    console.error('API error:', {
      statusCode,
      errorName: typeof error?.name === 'string' ? error.name : 'Error',
      errorCode: typeof error?.code === 'string' || typeof error?.code === 'number' ? error.code : undefined,
    })
  }

  res.status(statusCode).json({
    error: { message, ...(isApiError && error.details ? { details: error.details } : {}) },
  })
}
