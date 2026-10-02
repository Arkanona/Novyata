const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const token = () => localStorage.getItem('novyata_auth_token')
async function request(path, options = {}) { const response = await fetch(API_URL + path, { ...options, headers: { 'Content-Type': 'application/json', Authorization: token() ? 'Bearer ' + token() : '', ...options.headers } }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error?.message || 'Une erreur est survenue.'); return data }
export const getSavedAnswers = () => request('/api/v1/saved-answers')
export const createSavedAnswer = (payload) => request('/api/v1/saved-answers', { method: 'POST', body: JSON.stringify(payload) })
export const updateSavedAnswer = (id, payload) => request('/api/v1/saved-answers/' + id, { method: 'PATCH', body: JSON.stringify(payload) })
export const deleteSavedAnswer = (id) => request('/api/v1/saved-answers/' + id, { method: 'DELETE' })
