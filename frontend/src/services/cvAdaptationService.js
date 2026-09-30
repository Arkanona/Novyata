const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

async function request(path, options = {}) {
  const token = localStorage.getItem('novyata_token')
  const response = await fetch(API_URL + path, { ...options, headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '', ...options.headers } })
  const data = response.status === 204 ? null : await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data?.error?.message || 'Une erreur est survenue.')
  return data
}

export function getCvAdaptationProposals(analysisId) {
  return request(`/api/v1/job-analyses/${analysisId}/cv-adaptation`, { method: 'POST' })
}

export function applyCvAdaptation(analysisId, payload) {
  return request(`/api/v1/job-analyses/${analysisId}/cv-adaptation/apply`, { method: 'POST', body: JSON.stringify(payload) })
}
