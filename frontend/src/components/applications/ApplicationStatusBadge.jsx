const statusClass = {
  'À postuler': 'to-apply',
  'Candidature envoyée': 'sent',
  'En cours d’étude': 'review',
  Entretien: 'interview',
  Proposition: 'offer',
  Refusée: 'rejected',
  Archivée: 'archived',
}

export default function ApplicationStatusBadge({ status }) {
  return <span className={'application-status application-status--' + (statusClass[status] || 'to-apply')}>{status || 'À postuler'}</span>
}
