const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export async function request(path, options = {}) {
  const response = await fetch(API_URL + path, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) { const error = new Error(data.error?.message || 'Une erreur est survenue.'); error.details = data.error?.details || {}; throw error }
  return data
}
export function authenticatedRequest(path, options = {}) { return request(path, { ...options, headers: { Authorization: `Bearer ${localStorage.getItem('novyata_auth_token')}`, ...options.headers } }) }
