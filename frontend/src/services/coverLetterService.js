const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const TOKEN_KEY = 'novyata_auth_token'

async function request(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY)
  const response = await fetch(API_URL + path, {
    headers: { 'Content-Type': 'application/json', Authorization: token ? 'Bearer ' + token : '', ...options.headers },
    ...options,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.error?.message || 'Une erreur est survenue.')
    error.details = data.error?.details || {}
    throw error
  }
  return data
}

export const getCoverLetters = () => request('/api/v1/cover-letters')
export const getCoverLetter = (id) => request('/api/v1/cover-letters/' + id)
export const createCoverLetter = (payload) => request('/api/v1/cover-letters', { method: 'POST', body: JSON.stringify(payload) })
export const updateCoverLetter = (id, payload) => request('/api/v1/cover-letters/' + id, { method: 'PATCH', body: JSON.stringify(payload) })
export const deleteCoverLetter = (id) => request('/api/v1/cover-letters/' + id, { method: 'DELETE' })
