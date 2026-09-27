import { useEffect, useState } from 'react'
import { ArrowLeft, FileText } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Button from '../components/common/Button'
import { createResume, getResume } from '../services/resumeService'
import { useAuth } from '../store/AuthContext'

function formatDate(date) {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(date))
}

export default function ResumeEditorPage({ isNew = false }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [form, setForm] = useState({ title_resume: 'Mon CV', first_name: '', last_name: '', job_title: '' })
  const [resume, setResume] = useState(null)
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')
  const [isLoading, setIsLoading] = useState(!isNew)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isNew) {
      setForm((current) => ({ ...current, first_name: user?.first_name || '', last_name: user?.last_name || '' }))
      return
    }
    getResume(id).then(({ resume: currentResume }) => setResume(currentResume)).catch((error) => setApiError(error.message)).finally(() => setIsLoading(false))
  }, [id, isNew, user])

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '' }))
    setApiError('')
  }

  async function submit(event) {
    event.preventDefault()
    setIsSubmitting(true)
    setApiError('')
    try {
      const { resume: createdResume } = await createResume(form)
      navigate('/cv/' + createdResume.id_resume, { replace: true })
    } catch (error) {
      setErrors(error.details || {})
      setApiError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isNew && isLoading) return <main className="editor-page"><div className="resume-loading">Chargement du CV…</div></main>
  if (!isNew && apiError) return <main className="editor-page"><div className="resume-loading"><p>{apiError}</p><Link to="/dashboard">Retour au dashboard</Link></div></main>

  if (!isNew && resume) return <main className="editor-page"><header className="editor-header"><div className="editor-back"><Link to="/dashboard" aria-label="Retour au dashboard"><ArrowLeft size={18} /></Link><div><b>{resume.title_resume}</b><small>Créé le {formatDate(resume.created_at)}</small></div></div></header><section className="resume-detail"><div className="resume-detail-document"><p className="resume-detail-kicker">CV</p><h1>{resume.first_name} {resume.last_name}</h1><h2>{resume.job_title}</h2><hr /><h3>{resume.title_resume}</h3><p>Votre CV est créé. Vous pourrez compléter ses différentes sections prochainement.</p></div><aside><span><FileText size={20} /></span><h2>Votre CV est prêt</h2><p>Les expériences, formations, compétences et langues seront ajoutées dans les prochaines étapes.</p><Link to="/dashboard">Retour au dashboard</Link></aside></section></main>

  return <main className="editor-page"><header className="editor-header"><div className="editor-back"><Link to="/dashboard" aria-label="Retour au dashboard"><ArrowLeft size={18} /></Link><div><b>Nouveau CV</b><small>Première étape</small></div></div></header><section className="resume-create"><div><p className="resume-detail-kicker">Étape 1 sur 1</p><h1>Commençons par les informations essentielles.</h1><p>Vous pourrez enrichir votre CV plus tard, à votre rythme.</p></div><form onSubmit={submit} noValidate>{apiError && <p className="form-message form-message--error">{apiError}</p>}<label>Titre du CV<input name="title_resume" value={form.title_resume} onChange={updateField} aria-invalid={Boolean(errors.title_resume)} />{errors.title_resume && <small>{errors.title_resume}</small>}</label><div className="resume-name-fields"><label>Prénom<input name="first_name" value={form.first_name} onChange={updateField} aria-invalid={Boolean(errors.first_name)} />{errors.first_name && <small>{errors.first_name}</small>}</label><label>Nom<input name="last_name" value={form.last_name} onChange={updateField} aria-invalid={Boolean(errors.last_name)} />{errors.last_name && <small>{errors.last_name}</small>}</label></div><label>Poste recherché<input name="job_title" value={form.job_title} onChange={updateField} placeholder="Ex. Product Designer" aria-invalid={Boolean(errors.job_title)} />{errors.job_title && <small>{errors.job_title}</small>}</label><Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Création en cours…' : 'Créer mon CV'}</Button></form></section></main>
}
