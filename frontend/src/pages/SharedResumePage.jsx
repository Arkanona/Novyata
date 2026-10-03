import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ResumePreview from '../components/resume/ResumePreview'
import Button from '../components/common/Button'
import { getSharedResume } from '../services/resumeShareService'

export default function SharedResumePage() {
  const { token } = useParams()
  const [resume, setResume] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => { getSharedResume(token).then((result) => setResume(result.resume)).catch((requestError) => setError(requestError.message)) }, [token])
  if (error) return <main className="shared-resume-page"><section><h1>Ce lien n’est plus disponible</h1><p>Il a peut-être expiré ou été révoqué par son propriétaire.</p><Link to="/">Découvrir Novyata</Link></section></main>
  if (!resume) return <main className="shared-resume-page"><p role="status">Chargement du CV partagé…</p></main>
  return <main className="shared-resume-page"><header><div><p>CV partagé en privé</p><h1>{resume.title_resume}</h1></div><Link to="/"><Button type="button" variant="secondary">Découvrir Novyata</Button></Link></header><ResumePreview resume={resume} /></main>
}
