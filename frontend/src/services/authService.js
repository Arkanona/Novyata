const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

async function request(path, options = {}) {
  const response = await fetch(API_URL + path, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
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
