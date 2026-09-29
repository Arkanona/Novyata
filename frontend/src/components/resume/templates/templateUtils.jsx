export function formatDate(date) {
  if (!date) return ''
  const [year, month, day] = String(date).slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) return ''
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(Date.UTC(year, month - 1, day)))
}

export function dateRange(item) {
  return [formatDate(item.start_date), item.is_current ? 'Aujourd’hui' : formatDate(item.end_date)].filter(Boolean).join(' — ')
}

function compactDate(date) {
  if (!date) return ''
  const [year, month, day] = String(date).slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) return ''
  return new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric' }).format(new Date(Date.UTC(year, month - 1, day))).replace('.', '')
}

export function compactDateRange(item) {
  return [compactDate(item.start_date), item.is_current ? 'Aujourd’hui' : compactDate(item.end_date)].filter(Boolean).join(' — ')
}

export function byNewest(items = []) { return [...items].filter(Boolean).sort((a, b) => (b.start_date || '').localeCompare(a.start_date || '')) }

export function content(resume) {
  return {
    fullName: [resume.first_name, resume.last_name].filter(Boolean).join(' '),
    contact: [resume.email, resume.phone, resume.city].filter(Boolean),
    experiences: byNewest(resume.experiences).filter((item) => item.job_title || item.company),
    educations: byNewest(resume.educations).filter((item) => item.degree || item.school),
    skills: (resume.skills || []).filter((item) => item.name),
    languages: (resume.languages || []).filter((item) => item.name),
  }
}

export function SectionTitle({ children }) { return <h2 className="cv-section-title">{children}</h2> }
