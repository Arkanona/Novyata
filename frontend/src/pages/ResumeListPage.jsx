import { useEffect, useState } from 'react'
import { CirclePlus } from 'lucide-react'
import { Link } from 'react-router-dom'
import Button from '../components/common/Button'
import ResumeCard from '../components/dashboard/ResumeCard'
import ResumeEmptyState from '../components/resume/ResumeEmptyState'
import { getResumes } from '../services/resumeService'

export default function ResumeListPage() {
  const [resumes, setResumes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getResumes()
      .then(({ resumes: list }) => setResumes(list))
      .catch((requestError) => setError(requestError.message))
      .finally(() => setIsLoading(false))
  }, [])

  return <div className="app-page"><header className="app-header"><div><p className="crumb">Vos documents</p><h1>Mes CV</h1></div><Link to="/cv/nouveau"><Button><CirclePlus size={17} /> Nouveau CV</Button></Link></header>
    {isLoading && <div className="dashboard-feedback">Chargement de vos CV…</div>}
    {error && <div className="dashboard-feedback dashboard-feedback--error">{error}</div>}
    {!isLoading && !error && resumes.length === 0 && <ResumeEmptyState />}
    {!isLoading && !error && resumes.length > 0 && <section className="resume-list"><div className="dashboard-section-heading"><div><h2>Tous vos CV</h2><p>Ouvrez un document pour le modifier.</p></div><span>{resumes.length} {resumes.length > 1 ? 'CV' : 'CV'}</span></div><div className="resume-card-grid">{resumes.map((resume) => <ResumeCard key={resume.id_resume} resume={resume} />)}</div></section>}
  </div>
}
