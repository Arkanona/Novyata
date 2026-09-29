const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const TOKEN_KEY = 'novyata_auth_token'

export async function generateCoverLetter(payload) {
  const token = localStorage.getItem(TOKEN_KEY)
  const response = await fetch(API_URL + '/api/v1/cover-letter-generation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: token ? 'Bearer ' + token : '' },
    body: JSON.stringify(payload),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.error?.message || 'La génération de la lettre a échoué.')
    error.details = data.error?.details || {}
    throw error
  }
  return data
}
