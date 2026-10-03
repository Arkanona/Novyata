import { useState } from 'react'
import { ArrowLeft, FileUp, Plus, Trash2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../components/common/Button'
import { createResumeFromImport, parseResumeFile } from '../services/resumeService'

const blankExperience = { job_title: '', company: '', city: '', start_date: '', end_date: '', is_current: false, description: '' }
const blankEducation = { degree: '', school: '', city: '', start_date: '', end_date: '', description: '' }
const languageLevels = ['Débutant', 'Intermédiaire', 'Courant', 'Bilingue', 'Langue maternelle']

export default function ResumeImportPage() {
  const navigate = useNavigate()
  const [file, setFile] = useState(null)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [upgradeRequired, setUpgradeRequired] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [saving, setSaving] = useState(false)

  async function analyzeFile(event) {
    event.preventDefault()
    if (!file) return setError('Sélectionnez un fichier PDF ou DOCX.')
    setParsing(true); setError(''); setUpgradeRequired(false)
    try {
      const { import: parsed } = await parseResumeFile(file)
      setData(parsed)
    } catch (requestError) { setError(requestError.message); setUpgradeRequired(Boolean(requestError.details?.upgrade)) } finally { setParsing(false) }
  }

  function updateField(field, value) { setData((current) => ({ ...current, [field]: value })) }
  function updateItem(collection, index, field, value) {
    setData((current) => ({ ...current, [collection]: current[collection].map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item) }))
  }
  function removeItem(collection, index) { setData((current) => ({ ...current, [collection]: current[collection].filter((_, itemIndex) => itemIndex !== index) })) }

  async function saveResume(event) {
    event.preventDefault(); setSaving(true); setError(''); setUpgradeRequired(false)
    try {
      const preserveUndatedPeriod = (items) => items.map((item) => {
        const { date_text: sourcePeriod, ...reviewed } = item
        if (sourcePeriod && !reviewed.start_date && !reviewed.end_date && !reviewed.description?.includes(sourcePeriod)) {
          reviewed.description = [sourcePeriod, reviewed.description].filter(Boolean).join('\n')
        }
        return reviewed
      })
      const payload = { ...data, experiences: preserveUndatedPeriod(data.experiences), educations: preserveUndatedPeriod(data.educations), skills: data.skills, languages: data.languages }
      delete payload.raw_text; delete payload.format; delete payload.needs_review
      const { resume } = await createResumeFromImport(payload)
      navigate(`/cv/${resume.id_resume}`, { replace: true })
    } catch (requestError) { setError(requestError.message); setUpgradeRequired(Boolean(requestError.details?.upgrade)) } finally { setSaving(false) }
  }

  return <main className="app-page resume-import-page">
    <header className="app-header">
      <div><Link className="resume-import-back" to="/cv"><ArrowLeft size={16} /> Mes CV</Link><p className="crumb">Nouveau document</p><h1>Importer un CV</h1></div>
    </header>
    <section className="resume-import-intro"><FileUp size={22} /><div><h2>Gagnez du temps sur la première saisie</h2><p>Importez un PDF ou un document Word. Le texte est extrait sur le serveur, puis vous vérifiez et corrigez chaque information avant de créer votre CV.</p><small>PDF ou DOCX · 5 Mo maximum · 10 pages maximum · Jusqu’à 3 imports par mois avec Free, 30 avec Pro · Le fichier source n’est pas conservé.</small></div></section>
    {error && <p className="editor-feedback editor-feedback--error" role="alert">{error} {upgradeRequired && <> <Link to="/tarifs">Découvrir Novyata Pro</Link></>}</p>}
    {!data && <form className="resume-import-upload" onSubmit={analyzeFile}>
      <label htmlFor="resume-import-file">Fichier du CV</label>
      <input id="resume-import-file" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => { setFile(event.target.files?.[0] || null); setError(''); setUpgradeRequired(false) }} />
      {file && <p className="resume-import-file-name">{file.name} · {(file.size / (1024 * 1024)).toFixed(2)} Mo</p>}
      <Button disabled={parsing || !file}>{parsing ? 'Lecture du document…' : 'Analyser le fichier'}</Button>
    </form>}
    {data && <form className="resume-import-review" onSubmit={saveResume}>
      <div className="resume-import-review-heading"><div><p className="crumb">Étape 2 · Vérification manuelle</p><h2>Relisez les informations extraites</h2><p>Aucune donnée n’est créée avant votre confirmation. Les éléments signalés sont incertains ou n’ont pas pu être identifiés.</p></div><Button type="button" variant="secondary" onClick={() => { setData(null); setError('') }}>Choisir un autre fichier</Button></div>
      {data.needs_review.length > 0 && <div className="resume-import-warning" role="status"><b>À vérifier :</b> {data.needs_review.map((field) => ({ title_resume: 'titre', first_name: 'prénom', last_name: 'nom', job_title: 'poste recherché', summary: 'profil', experiences: 'expériences', educations: 'formations', skills: 'compétences', languages: 'langues', dates: 'dates' })[field]).join(', ')}. Les informations détectées sont des suggestions, pas des certitudes.</div>}
      <section className="resume-import-section"><h3>Informations principales</h3><div className="editor-field-grid">
        <label>Titre du CV<input required minLength="2" maxLength="120" value={data.title_resume} onChange={(event) => updateField('title_resume', event.target.value)} /></label>
        <label>Poste recherché<input required minLength="2" maxLength="160" value={data.job_title} onChange={(event) => updateField('job_title', event.target.value)} /></label>
        <label>Prénom<input required minLength="2" maxLength="80" value={data.first_name} onChange={(event) => updateField('first_name', event.target.value)} /></label>
        <label>Nom<input required minLength="2" maxLength="100" value={data.last_name} onChange={(event) => updateField('last_name', event.target.value)} /></label>
        <label>Email<input type="email" value={data.email} onChange={(event) => updateField('email', event.target.value)} /></label>
        <label>Téléphone<input value={data.phone} onChange={(event) => updateField('phone', event.target.value)} /></label>
        <label>Ville<input value={data.city} onChange={(event) => updateField('city', event.target.value)} /></label>
      </div><label>Profil<textarea rows="4" maxLength="2000" value={data.summary} onChange={(event) => updateField('summary', event.target.value)} /></label></section>

      <section className="resume-import-section"><div className="resume-import-section-heading"><h3>Expériences</h3><Button type="button" variant="secondary" onClick={() => updateField('experiences', [...data.experiences, { ...blankExperience }])}><Plus size={15} /> Ajouter</Button></div>
        {data.experiences.map((item, index) => <article className="resume-import-item" key={`experience-${index}`}>{item.date_text && <p className="resume-import-period">Période détectée — vérifiez les dates ci-dessous : <b>{item.date_text}</b></p>}<div className="editor-field-grid"><label>Poste<input required minLength="2" value={item.job_title} onChange={(event) => updateItem('experiences', index, 'job_title', event.target.value)} /></label><label>Entreprise<input required minLength="2" value={item.company} onChange={(event) => updateItem('experiences', index, 'company', event.target.value)} /></label><label>Ville<input value={item.city} onChange={(event) => updateItem('experiences', index, 'city', event.target.value)} /></label><label>Début<input type="date" value={item.start_date} onChange={(event) => updateItem('experiences', index, 'start_date', event.target.value)} /></label><label>Fin<input type="date" disabled={item.is_current} value={item.end_date} onChange={(event) => updateItem('experiences', index, 'end_date', event.target.value)} /></label></div><label className="resume-import-current"><input type="checkbox" checked={item.is_current} onChange={(event) => updateItem('experiences', index, 'is_current', event.target.checked)} /> Poste actuel</label><label>Description<textarea rows="3" maxLength="2000" value={item.description} onChange={(event) => updateItem('experiences', index, 'description', event.target.value)} /></label><Button type="button" variant="secondary" onClick={() => removeItem('experiences', index)}><Trash2 size={15} /> Supprimer l’expérience</Button></article>)}
      </section>

      <section className="resume-import-section"><div className="resume-import-section-heading"><h3>Formations</h3><Button type="button" variant="secondary" onClick={() => updateField('educations', [...data.educations, { ...blankEducation }])}><Plus size={15} /> Ajouter</Button></div>
        {data.educations.map((item, index) => <article className="resume-import-item" key={`education-${index}`}>{item.date_text && <p className="resume-import-period">Période détectée — vérifiez les dates ci-dessous : <b>{item.date_text}</b></p>}<div className="editor-field-grid"><label>Diplôme / Formation<input required minLength="2" value={item.degree} onChange={(event) => updateItem('educations', index, 'degree', event.target.value)} /></label><label>Établissement<input required minLength="2" value={item.school} onChange={(event) => updateItem('educations', index, 'school', event.target.value)} /></label><label>Ville<input value={item.city} onChange={(event) => updateItem('educations', index, 'city', event.target.value)} /></label><label>Début<input type="date" value={item.start_date} onChange={(event) => updateItem('educations', index, 'start_date', event.target.value)} /></label><label>Fin<input type="date" value={item.end_date} onChange={(event) => updateItem('educations', index, 'end_date', event.target.value)} /></label></div><label>Description<textarea rows="2" maxLength="2000" value={item.description} onChange={(event) => updateItem('educations', index, 'description', event.target.value)} /></label><Button type="button" variant="secondary" onClick={() => removeItem('educations', index)}><Trash2 size={15} /> Supprimer la formation</Button></article>)}
      </section>

      <section className="resume-import-section"><h3>Compétences</h3>{data.skills.map((item, index) => <div className="resume-import-tag-row" key={`skill-${index}`}><label>Compétence {index + 1}<input required minLength="2" value={item.name} onChange={(event) => updateItem('skills', index, 'name', event.target.value)} /></label><Button type="button" variant="secondary" aria-label={`Supprimer la compétence ${item.name || index + 1}`} onClick={() => removeItem('skills', index)}><Trash2 size={15} /></Button></div>)}<Button type="button" variant="secondary" onClick={() => updateField('skills', [...data.skills, { name: '', level: '' }])}><Plus size={15} /> Ajouter une compétence</Button></section>
      <section className="resume-import-section"><h3>Langues</h3>{data.languages.map((item, index) => <div className="resume-import-tag-row" key={`language-${index}`}><label>Langue {index + 1}<input required value={item.name} onChange={(event) => updateItem('languages', index, 'name', event.target.value)} /></label><label>Niveau<select required value={item.level} onChange={(event) => updateItem('languages', index, 'level', event.target.value)}><option value="">À préciser</option>{languageLevels.map((level) => <option key={level}>{level}</option>)}</select></label><Button type="button" variant="secondary" aria-label={`Supprimer la langue ${item.name || index + 1}`} onClick={() => removeItem('languages', index)}><Trash2 size={15} /></Button></div>)}<Button type="button" variant="secondary" onClick={() => updateField('languages', [...data.languages, { name: '', level: '' }])}><Plus size={15} /> Ajouter une langue</Button></section>
      <details className="resume-import-raw"><summary>Afficher le texte extrait pour vérification</summary><pre>{data.raw_text}</pre></details>
      <div className="resume-import-save"><p>Le CV source reste inchangé. Vous pourrez continuer à modifier ce nouveau CV après sa création.</p><Button disabled={saving}>{saving ? 'Création du CV…' : 'Créer mon CV à partir de cet import'}</Button></div>
    </form>}
  </main>
}
