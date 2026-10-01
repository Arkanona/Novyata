const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
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
export const getApplicationDossier = (id) => request('/api/v1/applications/' + id + '/dossier')
export const addApplicationNote = (id, payload) => request('/api/v1/applications/' + id + '/events', { method: 'POST', body: JSON.stringify(payload) })
export const createApplicationFollowup = (id, payload) => request('/api/v1/applications/' + id + '/followups', { method: 'POST', body: JSON.stringify(payload) })
export const createThankYouMessage = (id) => request('/api/v1/applications/' + id + '/thank-you', { method: 'POST' })
export const markApplicationFollowupSent = (id, followupId) => request('/api/v1/applications/' + id + '/followups/' + followupId + '/sent', { method: 'PATCH' })
export const updateApplicationFollowup = (id, followupId, payload) => request('/api/v1/applications/' + id + '/followups/' + followupId, { method: 'PATCH', body: JSON.stringify(payload) })
export const createApplicationInterview = (id, payload) => request('/api/v1/applications/' + id + '/interviews', { method: 'POST', body: JSON.stringify(payload) })
export const createInterviewPreparation = (id) => request('/api/v1/applications/' + id + '/interview-preparation', { method: 'POST' })
export const createInterviewSimulation = (id, payload) => request('/api/v1/applications/' + id + '/interview-simulation', { method: 'POST', body: JSON.stringify(payload) })
