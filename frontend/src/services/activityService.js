const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const TOKEN_KEY = 'novyata_auth_token'

export async function getActivityHistory() {
  const token = localStorage.getItem(TOKEN_KEY)
  const response = await fetch(API_URL + '/api/v1/activity', { headers: { Authorization: token ? `Bearer ${token}` : '' } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error?.message || 'L’historique est indisponible.')
  return data
}
