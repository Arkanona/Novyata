const responseStatuses = new Set(['En cours d’étude', 'Entretien', 'Proposition', 'Refusée'])
const sentStatuses = new Set(['Candidature envoyée', 'En cours d’étude', 'Entretien', 'Proposition', 'Refusée'])

export function summarizeApplications(applications = [], now = new Date()) {
  const sent = applications.filter((application) => sentStatuses.has(application.status))
  const responses = applications.filter((application) => responseStatuses.has(application.status))
  const interviews = applications.filter((application) => application.status === 'Entretien')
  const offers = applications.filter((application) => application.status === 'Proposition')
  const currentMonth = now.toISOString().slice(0, 7)
  const thisMonth = applications.filter((application) => String(application.application_date || application.created_at || '').slice(0, 7) === currentMonth)
  const rate = (items) => sent.length ? `${Math.round((items.length / sent.length) * 100)} %` : '—'
  return {
    sent,
    responses,
    interviews,
    offers,
    thisMonth,
    statistics: [['Candidatures envoyées', sent.length], ['Réponses', responses.length], ['Entretiens', interviews.length], ['Propositions', offers.length], ['Taux de réponse', rate(responses)], ['Taux entretien', rate(interviews)], ['Ce mois-ci', thisMonth.length]],
    funnel: [['Envoyées', sent.length], ['Réponses', responses.length], ['Entretiens', interviews.length], ['Propositions', offers.length]]
  }
}
