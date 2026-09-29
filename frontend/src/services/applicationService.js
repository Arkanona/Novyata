const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const TOKEN_KEY = 'novyata_auth_token'

async function request(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY)
  const response = await fetch(API_URL + path, { headers: { 'Content-Type': 'application/json', Authorization: token ? 'Bearer ' + token : '', ...options.headers }, ...options })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.error?.message || 'Une erreur est survenue.')
    error.details = data.error?.details || {}
    throw error
  }
  return data
}

export const applicationStatuses = ['À postuler', 'Candidature envoyée', 'En cours d’étude', 'Entretien', 'Proposition', 'Refusée', 'Archivée']
export const getApplications = () => request('/api/v1/applications')
export const getApplication = (id) => request('/api/v1/applications/' + id)
export const createApplication = (payload) => request('/api/v1/applications', { method: 'POST', body: JSON.stringify(payload) })
export const updateApplication = (id, payload) => request('/api/v1/applications/' + id, { method: 'PATCH', body: JSON.stringify(payload) })
export const deleteApplication = (id) => request('/api/v1/applications/' + id, { method: 'DELETE' })
