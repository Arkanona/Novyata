const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

async function request(path, options = {}) {
  const token = localStorage.getItem('novyata_auth_token')
  const response = await fetch(API_URL + path, { headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' }, ...options })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error?.message || 'Une erreur est survenue.')
  return data
}

export function getResumeShareLinks(resumeId) { return request(`/api/v1/resumes/${resumeId}/share-links`) }
export function createResumeShareLink(resumeId, settings) { return request(`/api/v1/resumes/${resumeId}/share-links`, { method: 'POST', body: JSON.stringify(settings) }) }
export function revokeResumeShareLink(resumeId, linkId) { return request(`/api/v1/resumes/${resumeId}/share-links/${linkId}`, { method: 'DELETE' }) }
export function getSharedResume(token) { return request(`/api/v1/shared-resumes/${encodeURIComponent(token)}`, { headers: {} }) }
