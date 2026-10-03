import { useEffect, useState } from 'react'
import { ArrowLeftRight, GitCompareArrows } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../store/AuthContext'
import { compareResumes, getResumes } from '../services/resumeService'
import Button from '../components/common/Button'

const fieldNames = { template_key: 'Modèle', accent_color: 'Couleur d’accent', font_size: 'Taille du texte', font_family: 'Police', content_density: 'Densité', section_spacing: 'Espacement', heading_style: 'Style des titres', divider_style: 'Séparateurs' }
const show = (value) => value === null || value === undefined || value === '' ? 'Non renseigné' : Array.isArray(value) ? value.join(' → ') : String(value)

function BeforeAfter({ title, change }) {
  if (!change) return null
  return <article className="resume-compare-change"><h3>{title}</h3><div><section><small>AVANT</small><p>{show(change.before)}</p></section><ArrowLeftRight size={17} aria-hidden="true" /><section><small>APRÈS</small><p>{show(change.after)}</p></section></div></article>
}

function ItemDiff({ title, diff, describe }) {
  if (!diff || !diff.added.length && !diff.removed.length && !diff.modified.length) return null
  return <article className="resume-compare-change"><h3>{title}</h3>
    {diff.added.map((item, index) => <div className="resume-compare-item resume-compare-item--added" key={`added-${index}`}><small>Ajouté</small><p>{describe(item)}</p></div>)}
    {diff.removed.map((item, index) => <div className="resume-compare-item resume-compare-item--removed" key={`removed-${index}`}><small>Retiré</small><p>{describe(item)}</p></div>)}
    {diff.modified.map((item, index) => <div className="resume-compare-item" key={`modified-${index}`}><small>Modifié</small><div><p><b>Avant</b> · {describe(item.before)}</p><p><b>Après</b> · {describe(item.after)}</p></div></div>)}
  </article>
}

const describeExperience = (item) => [item.job_title, item.company, item.city, item.description].filter(Boolean).join(' · ')
const describeEducation = (item) => [item.degree, item.school, item.city, item.description].filter(Boolean).join(' · ')
const describeTag = (item) => [item.name, item.level].filter(Boolean).join(' · ')
const describeSection = (item) => [item.title, item.content].filter(Boolean).join(' · ')

export default function ResumeComparePage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [resumes, setResumes] = useState([])
  const [leftId, setLeftId] = useState(searchParams.get('left') || '')
  const [rightId, setRightId] = useState(searchParams.get('right') || '')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [comparing, setComparing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { getResumes().then(({ resumes: items }) => { setResumes(items); setLeftId((current) => current || items[0]?.id_resume || ''); setRightId((current) => current || items[1]?.id_resume || '') }).catch((e) => setError(e.message)).finally(() => setLoading(false)) }, [])
  async function compare(event) {
    event.preventDefault(); setError(''); setResult(null); setComparing(true)
    try { setResult(await compareResumes(leftId, rightId)) } catch (e) { setError(e.message) } finally { setComparing(false) }
  }

  if (user?.plan !== 'pro') return <main className="app-page resume-compare-page"><header className="app-header"><div><p className="crumb">Novyata Pro</p><h1>Comparer deux CV</h1></div></header><section className="resume-history-locked"><h2>Un regard côte à côte sur vos versions</h2><p>Comparez les contenus et les choix de présentation de deux CV. Novyata ne modifie aucun document pendant la comparaison.</p><Link className="button" to="/tarifs">Découvrir Pro</Link></section></main>

  return <main className="app-page resume-compare-page"><header className="app-header"><div><p className="crumb">Vos documents</p><h1>Comparer deux CV</h1><p>Une comparaison déterministe, sans modifier vos documents.</p></div><Link to="/cv" aria-label="Retour à mes CV"><Button type="button" variant="secondary">Retour à mes CV</Button></Link></header>
    {loading ? <p role="status">Chargement de vos CV…</p> : <form className="resume-compare-select" onSubmit={compare}>
      <label>CV avant<select value={leftId} onChange={(event) => setLeftId(event.target.value)}><option value="">Choisir un CV</option>{resumes.map((resume) => <option key={resume.id_resume} value={resume.id_resume}>{resume.title_resume}</option>)}</select></label>
      <label>CV après<select value={rightId} onChange={(event) => setRightId(event.target.value)}><option value="">Choisir un CV</option>{resumes.map((resume) => <option key={resume.id_resume} value={resume.id_resume}>{resume.title_resume}</option>)}</select></label>
      <Button disabled={comparing || !leftId || !rightId || leftId === rightId}><GitCompareArrows size={16} />{comparing ? 'Comparaison…' : 'Comparer'}</Button>
    </form>}
    {error && <p className="editor-feedback editor-feedback--error" role="alert">{error}</p>}
    {result && <section className="resume-compare-results" aria-live="polite"><header><div><small>AVANT</small><h2>{result.left.title_resume}</h2><p>{result.left.job_title || 'Poste non renseigné'}</p></div><ArrowLeftRight size={20} /><div><small>APRÈS</small><h2>{result.right.title_resume}</h2><p>{result.right.job_title || 'Poste non renseigné'}</p></div></header>
      <BeforeAfter title="Profil" change={result.diff.summary} />
      <ItemDiff title="Expériences" diff={result.diff.experiences} describe={describeExperience} />
      <ItemDiff title="Formations" diff={result.diff.educations} describe={describeEducation} />
      <ItemDiff title="Compétences" diff={result.diff.skills} describe={describeTag} />
      <ItemDiff title="Langues" diff={result.diff.languages} describe={describeTag} />
      <ItemDiff title="Sections personnalisées" diff={result.diff.customSections} describe={describeSection} />
      <BeforeAfter title="Ordre des sections" change={result.diff.sectionOrder} />
      {Object.keys(result.diff.appearance).length > 0 && <article className="resume-compare-change"><h3>Présentation</h3>{Object.entries(result.diff.appearance).map(([key, change]) => <BeforeAfter key={key} title={fieldNames[key] || key} change={change} />)}</article>}
      {Object.values(result.diff).every((value) => value === null || Array.isArray(value?.added) && !value.added.length && !value.removed.length && !value.modified.length || !Object.keys(value || {}).length) && <p>Aucune différence de contenu ou de présentation.</p>}
    </section>}
  </main>
}
