const ids = {
  user: '8b74e3e1-64b4-46f1-bfd8-c50a174cf908',
  resume: 'f8c5d2f2-6ff2-43d2-9e4f-5443200f6d4b',
  letter: 'fa8dc2f2-6ff2-43d2-9e4f-5443200f6d4b',
  application: 'aa8dc2f2-6ff2-43d2-9e4f-5443200f6d4b',
}

export const user = { id_user: ids.user, first_name: 'Élise', last_name: 'Durand', email: 'elise.e2e@example.test', created_at: '2026-01-01T00:00:00.000Z' }

export async function mockApi(page) {
  const state = {
    resume: { id_resume: ids.resume, title_resume: 'CV E2E', first_name: 'Élise', last_name: 'Durand', email: user.email, phone: '0600000000', city: 'Paris', job_title: 'Product Designer', summary: 'Profil de test.', template_key: 'classic', accent_color: '#314A67', font_size: 'normal', experiences: [], educations: [], skills: [], languages: [], created_at: user.created_at, updated_at: user.created_at },
    letter: { id_cover_letter: ids.letter, id_resume: ids.resume, title: 'Lettre E2E', company_name: 'Novyata', job_title: 'Product Designer', recipient_name: '', recipient_position: '', company_address: '', subject: 'Candidature', content: 'Madame, Monsieur, je souhaite vous proposer ma candidature pour ce poste.', template: 'classic', created_at: user.created_at, updated_at: user.created_at },
    applications: [],
    jobAnalysis: { id_job_analysis: 'bb8dc2f2-6ff2-43d2-9e4f-5443200f6d4b', id_resume: ids.resume, title_resume: 'CV E2E', company_name: 'Novyata', job_title: 'Product Designer', job_description: 'Nous recherchons un Product Designer maîtrisant Figma.', match_score: 82, analysis: { id_job_analysis: 'bb8dc2f2-6ff2-43d2-9e4f-5443200f6d4b', matchScore: 82, requirements: [{ name: 'Figma', category: 'essential' }, { name: 'Recherche utilisateur', category: 'secondary' }, { name: 'Jira', category: 'bonus' }], strongMatches: [{ name: 'Figma', evidence: 'Figma', reason: 'Compétence citée dans le CV.' }], partialMatches: [{ name: 'Recherche utilisateur', evidence: 'Profil de test.', reason: 'Le contexte de pratique reste à détailler.' }], importantMissingSkills: [], optionalMissingSkills: [{ name: 'Jira', reason: 'Jira est apprécié mais absent du CV.' }], importantKeywords: ['Produit'], suggestions: ['Décrivez un projet où vous avez utilisé Figma.'], scoreExplanation: 'Les exigences essentielles ont le poids le plus élevé.', safetyNote: 'N’ajoutez une compétence à votre CV que si vous la maîtrisez réellement.' }, created_at: user.created_at, updated_at: user.created_at },
  }
  const json = (route, value, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) })
  const body = (request) => { try { return JSON.parse(request.postData() || '{}') } catch { return {} } }

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request(); const method = request.method(); const path = new URL(request.url()).pathname; const payload = body(request)
    if (path === '/api/v1/auth/register' || path === '/api/v1/auth/login') return json(route, { user, token: 'e2e-token' }, path.endsWith('register') ? 201 : 200)
    if (path === '/api/v1/auth/me') return json(route, { user })
    if (path === '/api/v1/resumes' && method === 'GET') return json(route, { resumes: [state.resume] })
    if (path === '/api/v1/resumes' && method === 'POST') { state.resume = { ...state.resume, ...payload, id_resume: ids.resume, experiences: [], educations: [], skills: [], languages: [] }; return json(route, { resume: state.resume }, 201) }
    if (path === `/api/v1/resumes/${ids.resume}` && method === 'GET') return json(route, { resume: state.resume })
    if (path === `/api/v1/resumes/${ids.resume}` && method === 'PATCH') { state.resume = { ...state.resume, ...payload }; return json(route, { resume: state.resume }) }
    if (path === `/api/v1/resumes/${ids.resume}` && method === 'DELETE') return route.fulfill({ status: 204 })
    if (path.includes(`/api/v1/resumes/${ids.resume}/experiences`) && method === 'POST') { const experience = { id_experience: 'e1', ...payload }; state.resume.experiences.push(experience); return json(route, { experience }, 201) }
    if (path.includes(`/api/v1/resumes/${ids.resume}/educations`) && method === 'POST') { const education = { id_education: 'd1', ...payload }; state.resume.educations.push(education); return json(route, { education }, 201) }
    if (path.includes(`/api/v1/resumes/${ids.resume}/skills`) && method === 'POST') { const skill = { id_skill: 's1', ...payload }; state.resume.skills.push(skill); return json(route, { skill }, 201) }
    if (path.includes(`/api/v1/resumes/${ids.resume}/languages`) && method === 'POST') { const language = { id_language: 'l1', ...payload }; state.resume.languages.push(language); return json(route, { language }, 201) }
    if (path === '/api/v1/cover-letters' && method === 'GET') return json(route, { cover_letters: [state.letter] })
    if (path === '/api/v1/cover-letters' && method === 'POST') { state.letter = { ...state.letter, ...payload, id_cover_letter: ids.letter }; return json(route, { cover_letter: state.letter }, 201) }
    if (path === `/api/v1/cover-letters/${ids.letter}` && method === 'GET') return json(route, { cover_letter: state.letter })
    if (path === `/api/v1/cover-letters/${ids.letter}` && method === 'PATCH') { state.letter = { ...state.letter, ...payload }; return json(route, { cover_letter: state.letter }) }
    if (path === `/api/v1/cover-letters/${ids.letter}` && method === 'DELETE') return route.fulfill({ status: 204 })
    if (path === '/api/v1/applications' && method === 'GET') return json(route, { applications: state.applications })
    if (path === '/api/v1/applications' && method === 'POST') { const application = { id_application: ids.application, ...payload, updated_at: user.created_at }; state.applications.push(application); return json(route, { application }, 201) }
    if (path === `/api/v1/applications/${ids.application}` && method === 'GET') return json(route, { application: state.applications[0] })
    if (path === `/api/v1/applications/${ids.application}` && method === 'PATCH') { state.applications[0] = { ...state.applications[0], ...payload }; return json(route, { application: state.applications[0] }) }
    if (path === `/api/v1/applications/${ids.application}` && method === 'DELETE') return route.fulfill({ status: 204 })
    if (path === '/api/v1/job-analysis') return json(route, { analysis: state.jobAnalysis.analysis }, 201)
    if (path === '/api/v1/job-analyses' && method === 'GET') return json(route, { job_analyses: [state.jobAnalysis] })
    if (path === `/api/v1/job-analyses/${state.jobAnalysis.id_job_analysis}` && method === 'GET') return json(route, { job_analysis: state.jobAnalysis })
    if (path === `/api/v1/job-analyses/${state.jobAnalysis.id_job_analysis}` && method === 'DELETE') return route.fulfill({ status: 204 })
    if (path === '/api/v1/cover-letter-generation') return json(route, { generation: { subject: 'Candidature Product Designer', content: 'Madame, Monsieur, je souhaite vous proposer ma candidature pour le poste de Product Designer.' } })
    return json(route, { error: { message: `Route E2E non mockée : ${method} ${path}` } }, 500)
  })
  return state
}

export async function authenticatedPage(page) {
  await page.addInitScript(() => localStorage.setItem('novyata_auth_token', 'e2e-token'))
  return mockApi(page)
}
