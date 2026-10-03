import { useState } from 'react'
import { Clock3, CopyPlus, RotateCcw } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { duplicateResumeVersion, getResumeVersions, restoreResumeVersion } from '../../services/resumeService'
import Button from '../common/Button'

const dateLabel = (value) => new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))

export default function ResumeHistory({ resume, plan }) {
  const [versions, setVersions] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function refresh() {
    setLoading(true); setError('')
    try { const result = await getResumeVersions(resume.id_resume); setVersions(result.versions || []) } catch (requestError) { setError(requestError.message) } finally { setLoading(false) }
  }
  async function restore(version) {
    if (!window.confirm('Créer un nouveau CV à partir de cette version ? Le CV actuel ne sera pas remplacé.')) return
    setLoading(true); setError('')
    try { const result = await restoreResumeVersion(resume.id_resume, version.id_resume_version); navigate(`/cv/${result.resume.id_resume}`) } catch (requestError) { setError(requestError.message); setLoading(false) }
  }
  async function duplicate(version) {
    setLoading(true); setError('')
    try { const result = await duplicateResumeVersion(resume.id_resume, version.id_resume_version); navigate(`/cv/${result.resume.id_resume}`) } catch (requestError) { setError(requestError.message); setLoading(false) }
  }

  return <section className="resume-history-card" aria-labelledby="resume-history-title">
    <details onToggle={(event) => { if (event.currentTarget.open && plan === 'pro' && versions.length === 0) refresh() }}>
      <summary><span><Clock3 size={18} /><span><small>Historique Pro</small><b id="resume-history-title">Versions enregistrées</b></span></span><span className="resume-history-count">{versions.length}</span></summary>
      {plan !== 'pro' ? <div className="pro-feature-locked"><p>Retrouvez les versions, comparez vos CV et restaurez une copie sans remplacer l’original.</p><Link className="pro-customization-cta" to="/tarifs">Découvrir Pro</Link></div> : <div className="resume-history-content">
        <p>Chaque modification enregistrée crée une version lorsque son contenu change. Une restauration crée toujours un nouveau CV.</p>
        <Button type="button" variant="secondary" disabled={loading} onClick={refresh}>{loading ? 'Actualisation…' : 'Actualiser l’historique'}</Button>
        {error && <p className="editor-feedback editor-feedback--error" role="alert">{error}</p>}
        {versions.length === 0 && !loading && <p>Aucune version disponible pour le moment.</p>}
        <ol>{versions.map((version) => <li key={version.id_resume_version}>
          <div><b>{version.version_label}</b><small>{version.reason} · {dateLabel(version.created_at)}</small></div>
          <div className="resume-history-actions"><Button type="button" variant="secondary" disabled={loading} onClick={() => duplicate(version)}><CopyPlus size={14} /> Dupliquer</Button><Button type="button" variant="secondary" disabled={loading} onClick={() => restore(version)}><RotateCcw size={14} /> Restaurer comme nouveau CV</Button></div>
        </li>)}</ol>
      </div>}
    </details>
  </section>
}
