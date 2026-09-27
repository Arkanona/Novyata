import jwt from 'jsonwebtoken'
import ApiError from '../utils/ApiError.js'

export default function authenticate(req, res, next) {
  const authorization = req.headers.authorization
  if (!authorization?.startsWith('Bearer ')) return next(new ApiError(401, 'Authentification requise.'))
  if (!process.env.JWT_SECRET) return next(new ApiError(500, 'La configuration d’authentification est incomplète.'))

  try {
    req.auth = jwt.verify(authorization.slice(7), process.env.JWT_SECRET)
    return next()
  } catch {
    return next(new ApiError(401, 'Session invalide ou expirée.'))
  }
}
