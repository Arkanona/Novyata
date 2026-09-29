import { useEffect, useState } from 'react'
import { ArrowLeft, Download } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Button from '../components/common/Button'
import CoverLetterPreview, { letterCharacterCount, letterWordCount } from '../components/coverLetters/CoverLetterPreview'
import { createCoverLetter, getCoverLetter, updateCoverLetter } from '../services/coverLetterService'
import { exportCoverLetterPdf } from '../services/coverLetterPdfExport'
import { getResume, getResumes } from '../services/resumeService'
import { useAuth } from '../store/AuthContext'

const emptyLetter = { title: 'Ma lettre de motivation', company_name: '', job_title: '', recipient_name: '', recipient_position: '', company_address: '', subject: '', content: '', id_resume: '', template: 'classic' }
const letterFields = Object.keys(emptyLetter)

function toForm(letter = {}) {
  return Object.fromEntries(letterFields.map((field) => [field, field === 'id_resume' ? letter[field] || '' : (letter[field] ?? emptyLetter[field])]))
}

export default function CoverLetterEditorPage({ isNew = false }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [letter, setLetter] = useState(emptyLetter)
  const [resumes, setResumes] = useState([])
  const [linkedResume, setLinkedResume] = useState(null)
  const [isLoading, setIsLoading] = useState(!isNew)
  const [isSaving, setIsSaving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => { getResumes().then(({ resumes: list }) => setResumes(list)).catch((requestError) => setError(requestError.message)) }, [])
  useEffect(() => {
    if (isNew) { setLetter(emptyLetter); setLinkedResume(null); setIsLoading(false); return }
    setIsLoading(true)
    getCoverLetter(id).then(({ cover_letter }) => setLetter(toForm(cover_letter))).catch((requestError) => setError(requestError.message)).finally(() => setIsLoading(false))
  }, [id, isNew])
  useEffect(() => {
    if (!letter.id_resume) { setLinkedResume(null); return }
    getResume(letter.id_resume).then(({ resume }) => setLinkedResume(resume)).catch(() => setLinkedResume(null))
  }, [letter.id_resume])

  function updateField(event) {
    const { name, value } = event.target
    setLetter((current) => ({ ...current, [name]: value }))
    setError('')
    setNotice('')
  }

  async function save(event) {
    event.preventDefault()
    setIsSaving(true); setError(''); setNotice('')
    try {
      const payload = { ...letter, id_resume: letter.id_resume || null }
      if (isNew) {
        const { cover_letter } = await createCoverLetter(payload)
        navigate('/lettres/' + cover_letter.id_cover_letter, { replace: true })
      } else {
        const { cover_letter } = await updateCoverLetter(id, payload)
        setLetter(toForm(cover_letter))
        setNotice('Modifications enregistrées.')
      }
    } catch (requestError) { setError(requestError.message) } finally { setIsSaving(false) }
  }

  async function downloadPdf() {
    setIsExporting(true); setError('')
    try { await exportCoverLetterPdf(letter, linkedResume, user) } catch (requestError) { setError(requestError.message || 'La génération du PDF a échoué.') } finally { setIsExporting(false) }
  }

  if (isLoading) return <main className="editor-page"><div className="resume-loading">Chargement de la lettre…</div></main>

  return <main className="cover-letter-editor-page"><header className="editor-header"><div className="editor-back"><Link to="/lettres" aria-label="Retour aux lettres"><ArrowLeft size={18} /></Link><div><b>{isNew ? 'Nouvelle lettre' : letter.title}</b><small>{isNew ? 'Brouillon' : 'Édition'}</small></div></div>{!isNew && <Button type="button" onClick={downloadPdf} disabled={isExporting || isSaving}><Download size={16} /> {isExporting ? 'Génération…' : 'Télécharger en PDF'}</Button>}</header>
    <div className="cover-letter-editor-layout"><form className="cover-letter-form" onSubmit={save} noValidate><div><p className="resume-detail-kicker">Lettre de motivation</p><h1>Personnalisez votre candidature.</h1><p>Les informations du CV lié sont utilisées uniquement pour l’aperçu.</p></div>{error && <p className="editor-feedback editor-feedback--error" role="alert">{error}</p>}{notice && <p className="editor-feedback" role="status">{notice}</p>}
      <label>CV associé <select name="id_resume" value={letter.id_resume} onChange={updateField}><option value="">Aucun CV associé</option>{resumes.map((resume) => <option key={resume.id_resume} value={resume.id_resume}>{resume.title_resume} — {resume.job_title}</option>)}</select><small>Facultatif — votre CV ne sera jamais modifié.</small></label>
      <label>Titre interne <input name="title" value={letter.title} onChange={updateField} /></label><div className="cover-letter-field-grid"><label>Entreprise <input name="company_name" value={letter.company_name} onChange={updateField} /></label><label>Poste visé <input name="job_title" value={letter.job_title} onChange={updateField} /></label></div><div className="cover-letter-field-grid"><label>Nom du destinataire <input name="recipient_name" value={letter.recipient_name} onChange={updateField} /></label><label>Fonction du destinataire <input name="recipient_position" value={letter.recipient_position} onChange={updateField} /></label></div><label>Adresse de l’entreprise <textarea name="company_address" value={letter.company_address} onChange={updateField} rows="2" /></label><label>Objet <input name="subject" value={letter.subject} onChange={updateField} placeholder="Ex. Candidature au poste de…" /></label><label>Contenu <textarea className="cover-letter-content-input" name="content" value={letter.content} onChange={updateField} rows="12" placeholder="Rédigez votre lettre de motivation…" /><small>{letterWordCount(letter.content)} mots · {letterCharacterCount(letter.content)} caractères</small></label>
      <fieldset className="cover-letter-template-picker"><legend>Modèle</legend><button type="button" className={letter.template === 'classic' ? 'active' : ''} onClick={() => setLetter((current) => ({ ...current, template: 'classic' }))}>Classique</button><button type="button" className={letter.template === 'modern' ? 'active' : ''} onClick={() => setLetter((current) => ({ ...current, template: 'modern' }))}>Moderne</button></fieldset><Button type="submit" disabled={isSaving}>{isSaving ? 'Enregistrement…' : (isNew ? 'Créer la lettre' : 'Enregistrer les modifications')}</Button>
    </form><aside className="cover-letter-preview-area"><p className="resume-preview-label">Aperçu A4 en direct</p><CoverLetterPreview letter={letter} resume={linkedResume} user={user} /></aside></div>
  </main>
}
