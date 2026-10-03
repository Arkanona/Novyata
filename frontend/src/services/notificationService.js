const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const TOKEN_KEY = 'novyata_auth_token'

async function request(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY)
  const response = await fetch(API_URL + path, {
    headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '', ...options.headers },
    ...options,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error?.message || 'Les notifications sont indisponibles.')
  return data
}

export const getNotifications = () => request('/api/v1/notifications')
export const createNextActionNotification = (payload) => request('/api/v1/notifications', { method: 'POST', body: JSON.stringify(payload) })
export const setNotificationRead = (id, is_read) => request(`/api/v1/notifications/${id}/read`, { method: 'PATCH', body: JSON.stringify({ is_read }) })
export const archiveNotification = (id) => request(`/api/v1/notifications/${id}/archive`, { method: 'PATCH' })
export const deleteNotification = (id) => request(`/api/v1/notifications/${id}`, { method: 'DELETE' })
export const markAllNotificationsRead = () => request('/api/v1/notifications/read-all', { method: 'PATCH' })
export const archiveAllNotifications = () => request('/api/v1/notifications/archive-all', { method: 'PATCH' })
