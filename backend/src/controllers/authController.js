import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { requireDatabase } from '../config/database.js'
import ApiError from '../utils/ApiError.js'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function serializeUser(user) {
  return {
    id_user: user.id_user,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    created_at: user.created_at,
  }
}

function createToken(user) {
  if (!process.env.JWT_SECRET) throw new ApiError(500, 'La configuration d’authentification est incomplète.')
  return jwt.sign(
    { sub: user.id_user, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
  )
}

function validateRegister(body) {
  const errors = {}
  const firstName = body.first_name?.trim()
  const lastName = body.last_name?.trim()
  const email = body.email?.trim().toLowerCase()
  const password = body.password

  if (!firstName || firstName.length < 2) errors.first_name = 'Le prénom doit contenir au moins 2 caractères.'
  if (!lastName || lastName.length < 2) errors.last_name = 'Le nom doit contenir au moins 2 caractères.'
  if (!emailPattern.test(email || '')) errors.email = 'Adresse e-mail invalide.'
  if (typeof password !== 'string' || password.length < 8) errors.password = 'Le mot de passe doit contenir au moins 8 caractères.'
  if (Object.keys(errors).length) throw new ApiError(400, 'Certaines informations sont invalides.', errors)

  return { firstName, lastName, email, password }
}

function validateLogin(body) {
  const errors = {}
  const email = body.email?.trim().toLowerCase()
  const password = body.password

  if (!emailPattern.test(email || '')) errors.email = 'Adresse e-mail invalide.'
  if (typeof password !== 'string' || !password) errors.password = 'Mot de passe requis.'
  if (Object.keys(errors).length) throw new ApiError(400, 'Certaines informations sont invalides.', errors)

  return { email, password }
}

export async function register(req, res, next) {
  try {
    const { firstName, lastName, email, password } = validateRegister(req.body)
    const passwordHash = await bcrypt.hash(password, 12)
    const result = await requireDatabase().query(
      'insert into users (first_name, last_name, email, password) values ($1, $2, $3, $4) returning id_user, first_name, last_name, email, created_at',
      [firstName, lastName, email, passwordHash],
    )
    const user = result.rows[0]
    return res.status(201).json({ user: serializeUser(user), token: createToken(user) })
  } catch (error) {
    if (error.code === '23505') return next(new ApiError(409, 'Cette adresse e-mail est déjà utilisée.'))
    return next(error)
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = validateLogin(req.body)
    const result = await requireDatabase().query(
      'select id_user, first_name, last_name, email, password, created_at from users where email = $1',
      [email],
    )
    const user = result.rows[0]

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new ApiError(401, 'Adresse e-mail ou mot de passe incorrect.')
    }

    return res.json({ user: serializeUser(user), token: createToken(user) })
  } catch (error) {
    return next(error)
  }
}

export async function me(req, res, next) {
  try {
    const result = await requireDatabase().query(
      'select id_user, first_name, last_name, email, created_at from users where id_user = $1',
      [req.auth.sub],
    )
    const user = result.rows[0]
    if (!user) throw new ApiError(401, 'Utilisateur introuvable.')
    return res.json({ user: serializeUser(user) })
  } catch (error) {
    return next(error)
  }
}

export async function updateProfile(req, res, next) {
  try {
    const { firstName, lastName, email } = validateRegister({ ...req.body, password: 'temporary-password' })
    const result = await requireDatabase().query('update users set first_name = $1, last_name = $2, email = $3, updated_at = now() where id_user = $4 returning id_user, first_name, last_name, email, created_at', [firstName, lastName, email, req.auth.sub])
    if (!result.rows[0]) throw new ApiError(404, 'Utilisateur introuvable.')
    return res.json({ user: serializeUser(result.rows[0]) })
  } catch (error) { if (error.code === '23505') return next(new ApiError(409, 'Cette adresse e-mail est déjà utilisée.')); return next(error) }
}

export async function changePassword(req, res, next) {
  try {
    const { current_password: currentPassword, new_password: newPassword, confirmation } = req.body
    const errors = {}
    if (!currentPassword) errors.current_password = 'Mot de passe actuel requis.'
    if (typeof newPassword !== 'string' || newPassword.length < 8) errors.new_password = 'Le nouveau mot de passe doit contenir au moins 8 caractères.'
    if (newPassword !== confirmation) errors.confirmation = 'Les mots de passe ne correspondent pas.'
    if (Object.keys(errors).length) throw new ApiError(400, 'Certaines informations sont invalides.', errors)
    const database = requireDatabase(); const found = await database.query('select password from users where id_user = $1', [req.auth.sub])
    if (!found.rows[0]) throw new ApiError(404, 'Utilisateur introuvable.')
    if (!(await bcrypt.compare(currentPassword, found.rows[0].password))) throw new ApiError(400, 'Le mot de passe actuel est incorrect.', { current_password: 'Mot de passe actuel incorrect.' })
    const hash = await bcrypt.hash(newPassword, 12)
    await database.query('update users set password = $1, updated_at = now() where id_user = $2', [hash, req.auth.sub])
    return res.status(204).send()
  } catch (error) { return next(error) }
}

export async function deleteAccount(req, res, next) {
  try {
    const result = await requireDatabase().query('delete from users where id_user = $1 returning id_user', [req.auth.sub])
    if (!result.rows[0]) throw new ApiError(404, 'Utilisateur introuvable.')
    return res.status(204).send()
  } catch (error) { return next(error) }
}
