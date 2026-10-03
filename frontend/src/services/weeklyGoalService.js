const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
async function request(path, options = {}) {
  const token = localStorage.getItem('novyata_auth_token')
  const response = await fetch(API_URL + path, { headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' }, ...options })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error?.message || 'Une erreur est survenue.')
  return data
}
export function getWeeklyGoal() { return request('/api/v1/weekly-goals') }
export function saveWeeklyGoal(goal) { return request('/api/v1/weekly-goals', { method: 'PUT', body: JSON.stringify(goal) }) }
