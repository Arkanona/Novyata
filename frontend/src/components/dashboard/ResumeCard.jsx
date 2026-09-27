import { ArrowRight, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'

function formatDate(date) {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date))
}

export default function ResumeCard({ resume }) {
  return <article className="resume-card">
    <div className="resume-card-preview"><span>{resume.first_name}<br />{resume.last_name}</span><i /><i /><i /></div>
    <div className="resume-card-content"><span className="resume-card-icon"><FileText size={15} /></span><div><h3>{resume.title_resume}</h3><p>{resume.job_title}</p><small>Modifié le {formatDate(resume.updated_at)}</small></div></div>
    <Link to={'/cv/' + resume.id_resume} className="resume-card-link">Modifier <ArrowRight size={14} /></Link>
  </article>
}
