import { useState } from 'react'
import { ArrowDown, ArrowUp, CirclePlus, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import Button from '../common/Button'
import { createCustomResumeSection, deleteCustomResumeSection, updateCustomResumeSection, updateResumeSectionOrder } from '../../services/resumeService'

const options = [
  ['projects', 'Projets'], ['certifications', 'Certifications'], ['volunteering', 'Bénévolat'],
  ['achievements', 'Réalisations'], ['publications', 'Publications'], ['portfolio', 'Portfolio'],
  ['github', 'GitHub'], ['linkedin', 'LinkedIn'], ['interests', 'Centres d’intérêt'],
]
const coreSections = [['summary', 'Profil'], ['experiences', 'Expériences'], ['educations', 'Formations'], ['skills', 'Compétences'], ['languages', 'Langues']]
const defaultOrder = coreSections.map(([id]) => id)

function normalizedOrder(order = [], sections = []) {
  const available = [...defaultOrder, ...sections.map((item) => `custom:${item.id_resume_section}`)]
  return [...(Array.isArray(order) ? order : []).filter((key) => available.includes(key)), ...available.filter((key) => !order?.includes(key))]
}

export default function AdvancedResumeSections({ resumeId, sections = [], sectionOrder = defaultOrder, onSectionsChange, onOrderChange, plan = 'free' }) {
  const [draft, setDraft] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const isPro = plan === 'pro'
  const order = normalizedOrder(sectionOrder, sections)

  async function saveSection(event) {
    event.preventDefault()
    setBusy(true); setError('')
    try {
      const payload = { section_type: draft.section_type, title: draft.title, content: draft.content, display_order: Math.max(0, sections.length) }
      const result = editingId
        ? await updateCustomResumeSection(resumeId, editingId, payload)
        : await createCustomResumeSection(resumeId, payload)
      const saved = result.section
      const nextSections = editingId ? sections.map((item) => item.id_resume_section === editingId ? saved : item) : [...sections, saved]
      onSectionsChange(nextSections)
      if (!editingId) {
        const nextOrder = [...order, `custom:${saved.id_resume_section}`]
        onOrderChange(nextOrder)
        await updateResumeSectionOrder(resumeId, nextOrder)
      }
      setDraft(null); setEditingId(null)
    } catch (requestError) { setError(requestError.message) } finally { setBusy(false) }
  }

  async function removeSection(section) {
    setBusy(true); setError('')
    try {
      await deleteCustomResumeSection(resumeId, section.id_resume_section)
      const nextSections = sections.filter((item) => item.id_resume_section !== section.id_resume_section)
      const nextOrder = order.filter((key) => key !== `custom:${section.id_resume_section}`)
      onSectionsChange(nextSections); onOrderChange(nextOrder)
      await updateResumeSectionOrder(resumeId, nextOrder)
    } catch (requestError) { setError(requestError.message) } finally { setBusy(false) }
  }

  async function move(key, offset) {
    const index = order.indexOf(key)
    const destination = index + offset
    if (destination < 0 || destination >= order.length) return
    const nextOrder = [...order]
    ;[nextOrder[index], nextOrder[destination]] = [nextOrder[destination], nextOrder[index]]
    setBusy(true); setError('')
    try { await updateResumeSectionOrder(resumeId, nextOrder); onOrderChange(nextOrder) }
    catch (requestError) { setError(requestError.message) }
    finally { setBusy(false) }
  }

  return <section className="resume-sections pro-resume-sections">
    <div className="resume-section-heading"><div><p>Novyata Pro</p><h2>Sections avancées</h2><span>Ajoutez uniquement les rubriques utiles à votre parcours.</span></div></div>
    {!isPro && <div className="pro-feature-locked"><p>Les sections avancées et leur réorganisation sont disponibles avec Novyata Pro.</p><Link className="pro-customization-cta" to="/tarifs">Découvrir Pro</Link></div>}
    {isPro && <>
      <div className="pro-section-order"><h3>Ordre des sections</h3><p>Utilisez les flèches pour organiser la lecture de votre CV.</p><ol>{order.map((key, index) => {
        const custom = key.startsWith('custom:') ? sections.find((item) => `custom:${item.id_resume_section}` === key) : null
        const label = custom?.title || coreSections.find(([id]) => id === key)?.[1] || key
        return <li key={key}><span>{label}</span><div><button type="button" aria-label={`Monter ${label}`} disabled={busy || index === 0} onClick={() => move(key, -1)}><ArrowUp size={15} /></button><button type="button" aria-label={`Descendre ${label}`} disabled={busy || index === order.length - 1} onClick={() => move(key, 1)}><ArrowDown size={15} /></button></div></li>
      })}</ol></div>
      <div className="pro-custom-section-list">{sections.map((section) => <article className="pro-custom-section-card" key={section.id_resume_section}><div><b>{section.title}</b><p>{section.content}</p></div><div><button type="button" onClick={() => { setEditingId(section.id_resume_section); setDraft({ section_type: section.section_type, title: section.title, content: section.content }) }}>Modifier</button><button type="button" className="section-delete" disabled={busy} onClick={() => removeSection(section)}><Trash2 size={14} /> Supprimer</button></div></article>)}</div>
      {draft ? <form className="resume-section-card" onSubmit={saveSection}>
        <label>Type de section<select value={draft.section_type} onChange={(event) => setDraft({ ...draft, section_type: event.target.value, title: draft.title || options.find(([id]) => id === event.target.value)?.[1] || '' })}>{options.map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label>
        <label>Titre<input maxLength={120} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} required /></label>
        <label>Contenu<textarea rows="4" maxLength={5000} value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} required /></label>
        {error && <p className="editor-feedback editor-feedback--error" role="alert">{error}</p>}
        <div className="pro-section-actions"><Button type="submit" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer la section'}</Button><button type="button" onClick={() => { setDraft(null); setEditingId(null) }}>Annuler</button></div>
      </form> : <button type="button" className="section-add" onClick={() => { setDraft({ section_type: 'projects', title: '', content: '' }); setEditingId(null) }}><CirclePlus size={16} /> Ajouter une section</button>}
      {error && !draft && <p className="editor-feedback editor-feedback--error" role="alert">{error}</p>}
    </>}
  </section>
}
