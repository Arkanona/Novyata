const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const TOKEN_KEY = 'novyata_auth_token'

export async function analyzeJobOffer(payload) {
  const token = localStorage.getItem(TOKEN_KEY)
  const response = await fetch(API_URL + '/api/v1/job-analysis', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: token ? 'Bearer ' + token : '' }, body: JSON.stringify(payload) })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.error?.message || 'L’analyse a échoué.')
    error.details = data.error?.details || {}
    throw error
  }
  return data
}

export async function importOfferFromUrl(url) {
  const token = localStorage.getItem(TOKEN_KEY)
  const response = await fetch(API_URL + '/api/v1/job-offer-import', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: token ? 'Bearer ' + token : '' }, body: JSON.stringify({ url }) })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error?.message || 'Impossible d’importer cette offre.')
  return data
}

export async function matchResumesToOffer(jobDescription) {
  const token = localStorage.getItem(TOKEN_KEY)
  const response = await fetch(API_URL + '/api/v1/resume-matching', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: token ? 'Bearer ' + token : '' }, body: JSON.stringify({ jobDescription }) })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error?.message || 'La comparaison des CV a échoué.')
  return data
}

async function request(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY)
  const response = await fetch(API_URL + path, { headers: { Authorization: token ? 'Bearer ' + token : '', ...options.headers }, ...options })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error?.message || 'Une erreur est survenue.')
  return data
}

export const getJobAnalyses = () => request('/api/v1/job-analyses')
export const getJobAnalysis = (id) => request('/api/v1/job-analyses/' + id)
export const deleteJobAnalysis = (id) => request('/api/v1/job-analyses/' + id, { method: 'DELETE' })
export const compareSavedOffers = (analysisIds) => request('/api/v1/job-analyses/compare', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ analysisIds }) })
