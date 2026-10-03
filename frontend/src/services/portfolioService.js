const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const token = () => localStorage.getItem('novyata_auth_token')

async function request(path, options = {}) {
  const authToken = token()
  const response = await fetch(API_URL + path, { headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) }, ...options })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error?.message || 'Une erreur est survenue.')
  return data
}

export function getMyPortfolio() { return request('/api/v1/portfolio/me') }
export function saveMyPortfolio(profile) { return request('/api/v1/portfolio/me', { method: 'PUT', body: JSON.stringify(profile) }) }
export function getPublicPortfolio(slug) { return request('/api/v1/portfolio/' + encodeURIComponent(slug)) }
