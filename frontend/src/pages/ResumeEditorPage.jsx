import { useEffect, useState } from 'react'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Button from '../components/common/Button'
import ResumeEditor from '../components/resume/ResumeEditor'
import ResumeVariants from '../components/resume/ResumeVariants'
import { createResume, deleteResume, getResume } from '../services/resumeService'
import { useAuth } from '../store/AuthContext'

function formatDate(date) {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(date))
}

export default function ResumeEditorPage({ isNew = false }) {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [form, setForm] = useState({ title_resume: 'Mon CV', first_name: '', last_name: '', job_title: '' })
  const [resume, setResume] = useState(null)
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')
  const [isLoading, setIsLoading] = useState(!isNew)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    if (isNew) {
      const template = searchParams.get('template')
      setForm((current) => ({ ...current, first_name: user?.first_name || '', last_name: user?.last_name || '', ...(template && ['classic', 'modern', 'minimal'].includes(template) ? { template_key: template } : {}) }))
      return
    }
    setResume(null)
    setIsLoading(true)
    getResume(id).then(({ resume: currentResume }) => setResume(currentResume)).catch((error) => setApiError(error.message)).finally(() => setIsLoading(false))
  }, [id, isNew, user, searchParams])

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

  async function removeResume() {
    setIsDeleting(true)
    setDeleteError('')
    try {
      await deleteResume(id)
      navigate('/dashboard', { replace: true })
    } catch (error) {
      setDeleteError(error.message)
    } finally {
      setIsDeleting(false)
    }
  }

  if (!isNew && isLoading) return <main className="editor-page"><div className="resume-loading">Chargement du CV…</div></main>
  if (!isNew && apiError) return <main className="editor-page"><div className="resume-loading"><p>{apiError}</p><Link to="/dashboard">Retour au dashboard</Link></div></main>

  if (!isNew && resume) return <main className="editor-page"><header className="editor-header"><div className="editor-back"><Link to="/dashboard" aria-label="Retour au dashboard"><ArrowLeft size={18} /></Link><div><b>{resume.title_resume}</b><small>Créé le {formatDate(resume.created_at)}</small></div></div><div className="editor-actions"><Button type="button" variant="danger" onClick={() => setIsDeleteConfirmationOpen(true)}><Trash2 size={16} /> Supprimer</Button></div></header><ResumeVariants resume={resume} plan={user?.plan || 'free'} /><ResumeEditor resume={resume} plan={user?.plan || 'free'} onSaved={setResume} />{isDeleteConfirmationOpen && <div className="confirmation-backdrop" role="presentation"><section className="confirmation-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-resume-title"><h2 id="delete-resume-title">Supprimer ce CV ?</h2><p>Cette action supprimera définitivement « {resume.title_resume} » et toutes ses informations.</p>{deleteError && <p className="confirmation-error" role="alert">{deleteError}</p>}<div className="confirmation-actions"><button type="button" className="confirmation-cancel" onClick={() => setIsDeleteConfirmationOpen(false)} disabled={isDeleting}>Annuler</button><Button type="button" variant="danger" onClick={removeResume} disabled={isDeleting}>{isDeleting ? 'Suppression…' : 'Supprimer définitivement'}</Button></div></section></div>}</main>

  return <main className="editor-page"><header className="editor-header"><div className="editor-back"><Link to="/dashboard" aria-label="Retour au dashboard"><ArrowLeft size={18} /></Link><div><b>Nouveau CV</b><small>Première étape</small></div></div></header><section className="resume-create"><div><p className="resume-detail-kicker">Étape 1 sur 1</p><h1>Commençons par les informations essentielles.</h1><p>Vous pourrez enrichir votre CV plus tard, à votre rythme.</p></div><form onSubmit={submit} noValidate>{apiError && <p className="form-message form-message--error">{apiError}</p>}<label>Titre du CV<input name="title_resume" value={form.title_resume} onChange={updateField} aria-invalid={Boolean(errors.title_resume)} />{errors.title_resume && <small>{errors.title_resume}</small>}</label><div className="resume-name-fields"><label>Prénom<input name="first_name" value={form.first_name} onChange={updateField} aria-invalid={Boolean(errors.first_name)} />{errors.first_name && <small>{errors.first_name}</small>}</label><label>Nom<input name="last_name" value={form.last_name} onChange={updateField} aria-invalid={Boolean(errors.last_name)} />{errors.last_name && <small>{errors.last_name}</small>}</label></div><label>Poste recherché<input name="job_title" value={form.job_title} onChange={updateField} placeholder="Ex. Product Designer" aria-invalid={Boolean(errors.job_title)} />{errors.job_title && <small>{errors.job_title}</small>}</label><Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Création en cours…' : 'Créer mon CV'}</Button></form></section></main>
}
