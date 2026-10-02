const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
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

export function updateResume(id, payload) {
  return request('/api/v1/resumes/' + id, { method: 'PATCH', body: JSON.stringify(payload) })
}

export function deleteResume(id) {
  return request('/api/v1/resumes/' + id, { method: 'DELETE' })
}

export function createExperience(resumeId, payload) { return request('/api/v1/resumes/' + resumeId + '/experiences', { method: 'POST', body: JSON.stringify(payload) }) }
export function updateExperience(resumeId, experienceId, payload) { return request('/api/v1/resumes/' + resumeId + '/experiences/' + experienceId, { method: 'PATCH', body: JSON.stringify(payload) }) }
export function deleteExperience(resumeId, experienceId) { return request('/api/v1/resumes/' + resumeId + '/experiences/' + experienceId, { method: 'DELETE' }) }
export function createEducation(resumeId, payload) { return request('/api/v1/resumes/' + resumeId + '/educations', { method: 'POST', body: JSON.stringify(payload) }) }
export function updateEducation(resumeId, educationId, payload) { return request('/api/v1/resumes/' + resumeId + '/educations/' + educationId, { method: 'PATCH', body: JSON.stringify(payload) }) }
export function deleteEducation(resumeId, educationId) { return request('/api/v1/resumes/' + resumeId + '/educations/' + educationId, { method: 'DELETE' }) }
export function createSkill(resumeId, payload) { return request('/api/v1/resumes/' + resumeId + '/skills', { method: 'POST', body: JSON.stringify(payload) }) }
export function updateSkill(resumeId, skillId, payload) { return request('/api/v1/resumes/' + resumeId + '/skills/' + skillId, { method: 'PATCH', body: JSON.stringify(payload) }) }
export function deleteSkill(resumeId, skillId) { return request('/api/v1/resumes/' + resumeId + '/skills/' + skillId, { method: 'DELETE' }) }
export function createLanguage(resumeId, payload) { return request('/api/v1/resumes/' + resumeId + '/languages', { method: 'POST', body: JSON.stringify(payload) }) }
export function updateLanguage(resumeId, languageId, payload) { return request('/api/v1/resumes/' + resumeId + '/languages/' + languageId, { method: 'PATCH', body: JSON.stringify(payload) }) }
export function deleteLanguage(resumeId, languageId) { return request('/api/v1/resumes/' + resumeId + '/languages/' + languageId, { method: 'DELETE' }) }
export function createCustomResumeSection(resumeId, payload) { return request('/api/v1/resumes/' + resumeId + '/sections', { method: 'POST', body: JSON.stringify(payload) }) }
export function updateCustomResumeSection(resumeId, sectionId, payload) { return request('/api/v1/resumes/' + resumeId + '/sections/' + sectionId, { method: 'PATCH', body: JSON.stringify(payload) }) }
export function deleteCustomResumeSection(resumeId, sectionId) { return request('/api/v1/resumes/' + resumeId + '/sections/' + sectionId, { method: 'DELETE' }) }
export function updateResumeSectionOrder(resumeId, sectionOrder) { return request('/api/v1/resumes/' + resumeId + '/section-order', { method: 'PUT', body: JSON.stringify({ section_order: sectionOrder }) }) }
export function createResumeVariant(resumeId, titleResume) { return request('/api/v1/resumes/' + resumeId + '/variants', { method: 'POST', body: JSON.stringify({ title_resume: titleResume }) }) }
