const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'
const TOKEN_KEY = 'novyata_auth_token'

async function request(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY)
  const response = await fetch(API_URL + path, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? 'Bearer ' + token : '',
      ...options.headers,
    },
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

export function getResumes() {
  return request('/api/v1/resumes')
}

export function getResume(id) {
  return request('/api/v1/resumes/' + id)
}

export function createResume(payload) {
  return request('/api/v1/resumes', { method: 'POST', body: JSON.stringify(payload) })
}
