import ApiError from '../utils/ApiError.js'

const appUrl = () => (process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')

async function deliver({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    if (process.env.NODE_ENV !== 'production') console.info('Transactional email skipped: provider is not configured.', { subject })
    return { delivered: false }
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, html }),
  })
  if (!response.ok) throw new ApiError(502, 'Le service d’envoi d’e-mails est temporairement indisponible.')
  return { delivered: true }
}

export function sendVerificationEmail({ email, token }) {
  const link = `${appUrl()}/verifier-email?token=${encodeURIComponent(token)}`
  return deliver({ to: email, subject: 'Vérifiez votre adresse e-mail Novyata', html: `<p>Bienvenue sur Novyata.</p><p><a href="${link}">Vérifier mon adresse e-mail</a></p><p>Ce lien expire dans 24 heures.</p>` })
}

export function sendPasswordResetEmail({ email, token }) {
  const link = `${appUrl()}/reinitialiser-mot-de-passe?token=${encodeURIComponent(token)}`
  return deliver({ to: email, subject: 'Réinitialisez votre mot de passe Novyata', html: `<p><a href="${link}">Choisir un nouveau mot de passe</a></p><p>Ce lien expire dans une heure.</p>` })
}
