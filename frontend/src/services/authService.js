const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

async function request(path, options = {}) {
  const response = await fetch(API_URL + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = new Error(data.error?.message || 'Une erreur est survenue.')
    error.details = data.error?.details || {}
    throw error
  }

  return data
}

export function registerUser(payload) {
  return request('/api/v1/auth/register', { method: 'POST', body: JSON.stringify(payload) })
}

export function loginUser(payload) {
  return request('/api/v1/auth/login', { method: 'POST', body: JSON.stringify(payload) })
}

export function getCurrentUser(token) {
  return request('/api/v1/auth/me', { headers: { Authorization: 'Bearer ' + token } })
}
function authenticated(path, method, payload) { return request(path, { method, headers: { Authorization: 'Bearer ' + localStorage.getItem('novyata_auth_token') }, ...(payload ? { body: JSON.stringify(payload) } : {}) }) }
export const updateProfile = (payload) => authenticated('/api/v1/auth/me', 'PATCH', payload)
export const changePassword = (payload) => authenticated('/api/v1/auth/me/password', 'PATCH', payload)
export const deleteAccount = () => authenticated('/api/v1/auth/me', 'DELETE')
