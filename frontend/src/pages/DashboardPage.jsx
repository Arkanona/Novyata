import { useEffect, useState } from 'react'
import { CirclePlus, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import Button from '../components/common/Button'
import ResumeCard from '../components/dashboard/ResumeCard'
import { getResumes } from '../services/resumeService'
import { useAuth } from '../store/AuthContext'

export default function DashboardPage() {
  const { user } = useAuth()
  const [resumes, setResumes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getResumes().then(({ resumes: list }) => setResumes(list)).catch((requestError) => setError(requestError.message)).finally(() => setIsLoading(false))
  }, [])

  return <div className="app-page"><header className="app-header"><div><p className="crumb">Bonjour {user?.first_name}</p><h1>Vue d'ensemble</h1></div><Link to="/cv/nouveau" className="button button--primary"><CirclePlus size={17} /> Créer un CV</Link></header>
    {isLoading && <div className="dashboard-feedback">Chargement de vos CV…</div>}
    {error && <div className="dashboard-feedback dashboard-feedback--error">{error}</div>}
    {!isLoading && !error && resumes.length === 0 && <section className="dashboard-empty"><span><FileText size={23} /></span><h2>Vous n’avez encore aucun CV.</h2><p>Créez votre premier CV pour commencer.</p><Link to="/cv/nouveau"><Button><CirclePlus size={17} /> Créer un CV</Button></Link></section>}
    {!isLoading && !error && resumes.length > 0 && <section className="dashboard-resumes"><div className="dashboard-section-heading"><div><h2>Mes CV</h2><p>Retrouvez et modifiez vos documents.</p></div><span>{resumes.length} {resumes.length > 1 ? 'CV' : 'CV'}</span></div><div className="resume-card-grid">{resumes.map((resume) => <ResumeCard key={resume.id_resume} resume={resume} />)}</div></section>}
  </div>
}
