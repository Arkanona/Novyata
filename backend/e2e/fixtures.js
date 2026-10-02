const ids = {
  user: '8b74e3e1-64b4-46f1-bfd8-c50a174cf908',
  resume: 'f8c5d2f2-6ff2-43d2-9e4f-5443200f6d4b',
  letter: 'fa8dc2f2-6ff2-43d2-9e4f-5443200f6d4b',
  application: 'aa8dc2f2-6ff2-43d2-9e4f-5443200f6d4b',
  adaptedResume: 'cc8dc2f2-6ff2-43d2-9e4f-5443200f6d4b',
}

export const user = { id_user: ids.user, first_name: 'Élise', last_name: 'Durand', email: 'elise.e2e@example.test', created_at: '2026-01-01T00:00:00.000Z' }

export async function mockApi(page) {
  const state = {
    resume: { id_resume: ids.resume, title_resume: 'CV E2E', first_name: 'Élise', last_name: 'Durand', email: user.email, phone: '0600000000', city: 'Paris', job_title: 'Product Designer', summary: 'Profil de test.', template_key: 'classic', accent_color: '#314A67', font_size: 'normal', experiences: [], educations: [], skills: [], languages: [], created_at: user.created_at, updated_at: user.created_at },
    letter: { id_cover_letter: ids.letter, id_resume: ids.resume, title: 'Lettre E2E', company_name: 'Novyata', job_title: 'Product Designer', recipient_name: '', recipient_position: '', company_address: '', subject: 'Candidature', content: 'Madame, Monsieur, je souhaite vous proposer ma candidature pour ce poste.', template: 'classic', created_at: user.created_at, updated_at: user.created_at },
    applications: [],
    events: [],
    interviews: [],
    followups: [],
    interviewSessions: [],
    adaptedResume: null,
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
    if (path === `/api/v1/resumes/${ids.adaptedResume}` && method === 'GET') return json(route, { resume: state.adaptedResume || state.resume })
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
    if (path === `/api/v1/applications/${ids.application}/dossier` && method === 'GET') return json(route, { application: state.applications[0], events: state.events, interviews: state.interviews, followups: state.followups, interview_sessions: state.interviewSessions, checklist: [] })
    if (path === `/api/v1/applications/${ids.application}/interviews` && method === 'POST') { const item = { id_interview: 'interview-e2e', ...payload }; state.interviews.push(item); state.events.unshift({ id_application_event: 'event-interview', event_date: '2026-01-02', title: 'Compte-rendu d’entretien ajouté' }); return json(route, { interview: item }, 201) }
    if (path === `/api/v1/applications/${ids.application}/interview-preparation` && method === 'POST') return json(route, { preparation: { questions: ['Parlez-nous de votre parcours.'] } })
    if (path === `/api/v1/applications/${ids.application}/interview-simulation` && method === 'POST') { const item = state.interviewSessions.find((entry) => entry.id_interview_session === payload.sessionId) || { id_interview_session: 'simulation-e2e', status: 'in_progress', exchanges: [], created_at: user.created_at, updated_at: user.created_at }; const simulation = { question: item.exchanges.length ? 'Comment collaborez-vous avec une équipe produit ?' : 'Pourquoi ce poste vous intéresse-t-il ?', feedback: { positives: ['Réponse structurée'], missing: 'Un exemple concret.', suggestion: 'Ajoutez une réalisation réelle.' } }; item.exchanges.push({ question: simulation.question, answer: payload.answer || '', feedback: simulation.feedback }); item.progress = item.exchanges.length; if (!state.interviewSessions.includes(item)) state.interviewSessions.push(item); return json(route, { simulation, session: item }) }
    if (path === `/api/v1/applications/${ids.application}/interview-simulations/simulation-e2e/complete` && method === 'PATCH') { state.interviewSessions[0].status = 'completed'; return json(route, { session: state.interviewSessions[0] }) }
    if (path === `/api/v1/applications/${ids.application}/thank-you` && method === 'POST') { const item = { id_followup: 'thank-you-e2e', type: 'Remerciement', content: 'Merci pour notre échange.', sent_at: null }; state.followups.push(item); return json(route, { followup: item }, 201) }
    if (path === `/api/v1/applications/${ids.application}/followups/thank-you-e2e/sent` && method === 'PATCH') { state.followups[0].sent_at = '2026-01-02'; state.events.unshift({ id_application_event: 'event-thanks', event_date: '2026-01-02', title: 'Relance envoyée' }); return json(route, { followup: state.followups[0] }) }
    if (path === `/api/v1/applications/${ids.application}` && method === 'PATCH') { state.applications[0] = { ...state.applications[0], ...payload }; return json(route, { application: state.applications[0] }) }
    if (path === `/api/v1/applications/${ids.application}` && method === 'DELETE') return route.fulfill({ status: 204 })
    if (path === '/api/v1/job-analysis') return json(route, { analysis: state.jobAnalysis.analysis }, 201)
    if (path === '/api/v1/job-analyses' && method === 'GET') return json(route, { job_analyses: [state.jobAnalysis] })
    if (path === `/api/v1/job-analyses/${state.jobAnalysis.id_job_analysis}` && method === 'GET') return json(route, { job_analysis: state.jobAnalysis })
    if (path === `/api/v1/job-analyses/${state.jobAnalysis.id_job_analysis}/cv-adaptation` && method === 'POST') return json(route, { adaptation: { proposals: [{ id: 'summary-1', field: 'summary', targetIndex: 0, currentText: 'Profil de test.', proposedText: 'Product Designer spécialisé dans les parcours utilisateurs et Figma.', reason: 'Met en avant des éléments déjà présents.' }] } })
    if (path === `/api/v1/job-analyses/${state.jobAnalysis.id_job_analysis}/cv-adaptation/apply` && method === 'POST') { state.adaptedResume = { ...state.resume, id_resume: ids.adaptedResume, title_resume: 'CV E2E — Novyata', summary: payload.acceptedIds?.includes('summary-1') ? 'Product Designer spécialisé dans les parcours utilisateurs et Figma.' : state.resume.summary }; return json(route, { resume: { id_resume: ids.adaptedResume, title_resume: state.adaptedResume.title_resume }, appliedCount: payload.acceptedIds?.length || 0 }, 201) }
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
