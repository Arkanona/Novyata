import { useState } from 'react'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import Button from '../components/common/Button'
import Logo from '../components/common/Logo'
import { useAuth } from '../store/AuthContext'

const emptyForm = { first_name: '', last_name: '', email: '', password: '', password_confirmation: '' }

function validate(form, isSignUp) {
  const errors = {}
  if (isSignUp && form.first_name.trim().length < 2) errors.first_name = 'Indiquez votre prénom.'
  if (isSignUp && form.last_name.trim().length < 2) errors.last_name = 'Indiquez votre nom.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Indiquez une adresse e-mail valide.'
  if (form.password.length < 8) errors.password = 'Le mot de passe doit contenir au moins 8 caractères.'
  if (isSignUp && form.password !== form.password_confirmation) errors.password_confirmation = 'Les mots de passe ne correspondent pas.'
  return errors
}

export default function AuthPage({ mode }) {
  const isSignUp = mode === 'signup'
  const navigate = useNavigate()
  const location = useLocation()
  const { login, register, isAuthenticated } = useAuth()
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '' }))
    setApiError('')
  }

  async function submit(event) {
    event.preventDefault()
    const nextErrors = validate(form, isSignUp)
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }

    setIsSubmitting(true)
    setApiError('')
    try {
      if (isSignUp) {
        await register({ first_name: form.first_name.trim(), last_name: form.last_name.trim(), email: form.email.trim(), password: form.password })
      } else {
        await login({ email: form.email.trim(), password: form.password })
      }
      navigate(location.state?.from || '/dashboard', { replace: true })
    } catch (error) {
      setErrors(error.details || {})
      setApiError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return <main className="auth-page"><div className="auth-top"><Logo /><Link to="/">Retour à l’accueil</Link></div><section className="auth-card"><p className="auth-kicker">{isSignUp ? 'Bienvenue chez Novyata' : 'Ravi de vous revoir'}</p><h1>{isSignUp ? 'Créez votre compte' : 'Connectez-vous à votre espace'}</h1><p className="auth-intro">{isSignUp ? 'Commencez à créer un CV clair et professionnel.' : 'Retrouvez vos CV et vos démarches en un seul endroit.'}</p>
    {apiError && <p className="form-message form-message--error" role="alert">{apiError}</p>}
    <form onSubmit={submit} noValidate>
      {isSignUp && <div className="auth-name-fields"><label>Prénom<input name="first_name" value={form.first_name} onChange={updateField} autoComplete="given-name" aria-invalid={Boolean(errors.first_name)} />{errors.first_name && <small>{errors.first_name}</small>}</label><label>Nom<input name="last_name" value={form.last_name} onChange={updateField} autoComplete="family-name" aria-invalid={Boolean(errors.last_name)} />{errors.last_name && <small>{errors.last_name}</small>}</label></div>}
      <label>Adresse e-mail<input name="email" type="email" value={form.email} onChange={updateField} autoComplete="email" aria-invalid={Boolean(errors.email)} />{errors.email && <small>{errors.email}</small>}</label>
      <label>Mot de passe<span className="password-field"><input name="password" type={isPasswordVisible ? 'text' : 'password'} value={form.password} onChange={updateField} autoComplete={isSignUp ? 'new-password' : 'current-password'} aria-invalid={Boolean(errors.password)} /><button type="button" className="password-visibility-toggle" aria-label={isPasswordVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} aria-pressed={isPasswordVisible} onClick={() => setIsPasswordVisible((visible) => !visible)}>{isPasswordVisible ? <EyeOff size={17} /> : <Eye size={17} />}</button></span>{errors.password && <small>{errors.password}</small>}</label>
      {isSignUp && <label>Confirmer le mot de passe<input name="password_confirmation" type="password" value={form.password_confirmation} onChange={updateField} autoComplete="new-password" aria-invalid={Boolean(errors.password_confirmation)} />{errors.password_confirmation && <small>{errors.password_confirmation}</small>}</label>}
      <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Veuillez patienter…' : isSignUp ? 'Créer mon compte' : 'Se connecter'} {!isSubmitting && <ArrowRight size={16} />}</Button>
    </form><p className="auth-switch">{isSignUp ? 'Vous avez déjà un compte ?' : 'Vous découvrez Novyata ?'} <Link to={isSignUp ? '/connexion' : '/inscription'}>{isSignUp ? 'Se connecter' : 'Créer un compte'}</Link></p></section></main>
}
