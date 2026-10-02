import { useEffect, useState } from 'react'
import { CirclePlus, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import Button from '../components/common/Button'
import ResumeCard from '../components/dashboard/ResumeCard'
import { getApplications } from '../services/applicationService'
import { getResumes } from '../services/resumeService'
import { useAuth } from '../store/AuthContext'
import { summarizeApplications } from '../utils/applicationStatistics'

export default function DashboardPage() {
  const { user } = useAuth()
  const [resumes, setResumes] = useState([])
  const [applications, setApplications] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getResumes(), getApplications()]).then(([resumeData, applicationData]) => { setResumes(resumeData.resumes); setApplications(applicationData.applications) }).catch((requestError) => setError(requestError.message)).finally(() => setIsLoading(false))
  }, [])

  const { statistics, funnel } = summarizeApplications(applications)

  return <div className="app-page"><header className="app-header"><div><p className="crumb">Bonjour {user?.first_name}</p><h1>Vue d'ensemble</h1></div><Link to="/cv/nouveau" className="button button--primary"><CirclePlus size={17} /> Créer un CV</Link></header>
    {isLoading && <div className="dashboard-feedback">Chargement de vos CV…</div>}
    {error && <div className="dashboard-feedback dashboard-feedback--error">{error}</div>}
    {!isLoading && !error && <><section className="application-statistics">{statistics.map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}</section><section className="application-funnel" aria-label="Parcours de vos candidatures"><h2>Parcours de vos candidatures</h2><ol>{funnel.map(([label, value]) => <li key={label}><b>{value}</b><span>{label}</span></li>)}</ol></section></>}
    {!isLoading && !error && resumes.length === 0 && <section className="dashboard-empty"><span><FileText size={23} /></span><h2>Vous n’avez encore aucun CV.</h2><p>Créez votre premier CV pour commencer.</p><Link to="/cv/nouveau"><Button><CirclePlus size={17} /> Créer un CV</Button></Link></section>}
    {!isLoading && !error && resumes.length > 0 && <section className="dashboard-resumes"><div className="dashboard-section-heading"><div><h2>Mes CV</h2><p>Retrouvez et modifiez vos documents.</p></div><span>{resumes.length} {resumes.length > 1 ? 'CV' : 'CV'}</span></div><div className="resume-card-grid">{resumes.map((resume) => <ResumeCard key={resume.id_resume} resume={resume} />)}</div></section>}
  </div>
}
