import { useEffect, useState } from 'react'
import { ExternalLink, Eye, Globe2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import Button from '../components/common/Button'
import { getResumes } from '../services/resumeService'
import { getMyPortfolio, saveMyPortfolio } from '../services/portfolioService'
import { useAuth } from '../store/AuthContext'

const initialSections = { name: false, job_title: false, summary: false, experiences: false, educations: false, skills: false, languages: false, custom_sections: false }
const slugify = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60).replace(/-+$/g, '')
const sectionLabels = { name: 'Nom', job_title: 'Poste recherché', summary: 'Présentation', experiences: 'Expériences', educations: 'Formations', skills: 'Compétences', languages: 'Langues', custom_sections: 'Sections personnalisées' }

export default function PortfolioSettingsPage() {
  const { user } = useAuth()
  const [resumes, setResumes] = useState([])
  const [form, setForm] = useState({ slug: '', id_resume: '', is_published: false, visible_sections: initialSections })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  useEffect(() => { Promise.all([getMyPortfolio(), getResumes()]).then(([result, resumeResult]) => { setResumes(resumeResult.resumes || []); const profile = result.profile; setForm(profile ? { slug: profile.slug, id_resume: profile.id_resume || '', is_published: profile.is_published, visible_sections: { ...initialSections, ...profile.visible_sections } } : { slug: slugify(`${user?.first_name || ''}-${user?.last_name || ''}`), id_resume: resumeResult.resumes?.[0]?.id_resume || '', is_published: false, visible_sections: initialSections }) }).catch((requestError) => setError(requestError.message)).finally(() => setLoading(false)) }, [user])
  const updateSection = (event) => setForm((current) => ({ ...current, visible_sections: { ...current.visible_sections, [event.target.name]: event.target.checked } }))
  async function save(event) { event.preventDefault(); setSaving(true); setError(''); setNotice(''); try { const result = await saveMyPortfolio({ ...form, id_resume: form.id_resume || null }); setForm({ ...form, ...result.profile, id_resume: result.profile.id_resume || '' }); setNotice('Vos préférences de visibilité ont été enregistrées.') } catch (requestError) { setError(requestError.message) } finally { setSaving(false) } }
  if (loading) return <main className="app-page"><p role="status">Chargement du portfolio…</p></main>
  return <main className="app-page portfolio-settings-page"><header className="app-header"><div><p className="crumb">Partage contrôlé</p><h1>Votre portfolio public</h1><p>Rien n’est publié avant votre activation explicite. L’adresse e-mail, le téléphone et la ville ne sont jamais affichés ici.</p></div></header><form className="portfolio-settings-card" onSubmit={save}>
    {error && <p className="editor-feedback editor-feedback--error" role="alert">{error}</p>}{notice && <p role="status" className="editor-feedback">{notice}</p>}
    <label>CV source<select value={form.id_resume} onChange={(event) => setForm((current) => ({ ...current, id_resume: event.target.value }))}><option value="">Choisir un CV</option>{resumes.map((resume) => <option key={resume.id_resume} value={resume.id_resume}>{resume.title_resume} — {resume.job_title || 'Poste non renseigné'}</option>)}</select><small>Seules les rubriques choisies ci-dessous seront partagées.</small></label>
    <label>Adresse publique<div className="portfolio-slug-field"><span>novyata.app/p/</span><input value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: slugify(event.target.value) }))} maxLength="60" required /></div></label>
    <fieldset><legend>Informations visibles</legend><div className="portfolio-visibility-grid">{Object.entries(sectionLabels).map(([key, label]) => <label key={key}><input type="checkbox" name={key} checked={Boolean(form.visible_sections[key])} onChange={updateSection} />{label}</label>)}</div></fieldset>
    <label className="portfolio-publish-toggle"><input type="checkbox" aria-label="Publier mon portfolio" checked={form.is_published} onChange={(event) => setForm((current) => ({ ...current, is_published: event.target.checked }))} /><span><b><Globe2 size={16} /> Publier mon portfolio</b><small>Vous pourrez le désactiver à tout moment.</small></span></label>
    <Button type="submit" disabled={saving || resumes.length === 0}>{saving ? 'Enregistrement…' : 'Enregistrer les réglages'}</Button>
    {resumes.length === 0 && <p>Créez d’abord un CV pour préparer votre portfolio.</p>}
    {form.is_published && form.slug && <Link to={`/p/${form.slug}`} target="_blank"><Eye size={16} /> Aperçu public <ExternalLink size={14} /></Link>}
  </form></main>
}
