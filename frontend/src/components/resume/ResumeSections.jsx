import { ChevronDown, ChevronUp, CirclePlus, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import Button from '../common/Button'
import { createEducation, createExperience, deleteEducation, deleteExperience, improveResumeExperience, updateEducation, updateExperience } from '../../services/resumeService'
import AutocompleteInput from '../common/AutocompleteInput'
import { jobSuggestions } from '../../data/jobSuggestions'
import { educationDegrees, educationDomains } from '../../data/educationSuggestions'

const blankExperience = () => ({ id_experience: 'new-' + Date.now(), job_title: '', company: '', city: '', start_date: '', end_date: '', is_current: false, description: '' })
const blankEducation = () => ({ id_education: 'new-' + Date.now(), degree: '', school: '', city: '', start_date: '', end_date: '', description: '' })
const toInputDate = (date) => date ? String(date).slice(0, 10) : ''

function formatDate(date) {
  if (!date) return ''
  const parsed = new Date(String(date).slice(0, 10) + 'T12:00:00')
  return Number.isNaN(parsed.getTime()) ? '' : new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric' }).format(parsed)
}

function dateAndCity(item) {
  const start = formatDate(item.start_date)
  const end = item.is_current ? 'Aujourd’hui' : formatDate(item.end_date)
  const dates = [start, end].filter(Boolean).join(' → ')
  return [dates, item.city].filter(Boolean).join(' · ') || 'Dates et ville à compléter'
}

function CompactCard({ item, kind, onOpen, onDelete }) {
  const title = kind === 'experience' ? item.job_title : item.degree
  const organization = kind === 'experience' ? item.company : item.school
  const description = item.description?.trim()
  return <article className="resume-section-card resume-section-card--compact"><button type="button" className="resume-section-summary" onClick={onOpen} aria-label={'Modifier ' + (title || (kind === 'experience' ? 'l’expérience' : 'la formation'))}><span><b>{title || (kind === 'experience' ? 'Expérience à compléter' : 'Formation à compléter')}</b>{organization && <strong>{organization}</strong>}<small>{dateAndCity(item)}</small>{description && <em>{description.slice(0, 112)}{description.length > 112 ? '…' : ''}</em>}</span><ChevronDown size={18} aria-hidden="true" /></button><div className="resume-section-compact-actions"><button type="button" className="section-edit" onClick={onOpen}><Pencil size={15} /> Modifier</button><button type="button" className="section-delete" onClick={onDelete} aria-label={'Supprimer ' + (kind === 'experience' ? 'l’expérience' : 'la formation')}><Trash2 size={15} /> Supprimer</button></div></article>
}

function ExperienceCard({ item, resumeId, onChange, onSave, onDelete, onClose, isSaving, isOverflow }) {
  const [suggestion, setSuggestion] = useState('')
  const [suggestionError, setSuggestionError] = useState('')
  const [isImproving, setIsImproving] = useState(false)
  async function improve() { setIsImproving(true); setSuggestionError(''); setSuggestion(''); try { const result = await improveResumeExperience(resumeId, item.id_experience, item.description); setSuggestion(result.suggestion || '') } catch (error) { setSuggestionError(error.message) } finally { setIsImproving(false) } }
  return <article className="resume-section-card resume-section-card--open"><div className="resume-section-card-heading"><button type="button" className="resume-section-collapse" onClick={onClose}><b>Expérience professionnelle</b><ChevronUp size={18} aria-hidden="true" /></button><button type="button" className="section-delete" onClick={onDelete} aria-label="Supprimer l’expérience"><Trash2 size={15} /> Supprimer</button></div><div className="editor-field-grid"><AutocompleteInput label="Poste" value={item.job_title} onChange={(value) => onChange('job_title', value)} suggestions={jobSuggestions} placeholder="Rechercher un métier" /><label>Entreprise<input value={item.company} onChange={(event) => onChange('company', event.target.value)} /></label></div><div className="editor-field-grid"><label>Ville<input value={item.city} onChange={(event) => onChange('city', event.target.value)} /></label><label>Date de début<input type="date" lang="fr" value={toInputDate(item.start_date)} onChange={(event) => onChange('start_date', event.target.value)} /></label></div><label className="current-job"><input type="checkbox" checked={item.is_current} onChange={(event) => onChange('is_current', event.target.checked)} /> Poste actuel</label>{!item.is_current && <label>Date de fin<input type="date" lang="fr" value={toInputDate(item.end_date)} onChange={(event) => onChange('end_date', event.target.value)} /></label>}<label>Description<textarea rows="4" value={item.description || ''} onChange={(event) => onChange('description', event.target.value)} /></label><div className="resume-experience-assistant"><Button type="button" variant="secondary" onClick={improve} disabled={isImproving || isSaving || item.id_experience.startsWith('new-') || (item.description || '').trim().length < 10}>{isImproving ? 'Préparation de la proposition…' : 'Améliorer la description'}</Button><small>La proposition n’ajoute aucun fait et ne remplace pas votre texte.</small></div>{suggestionError && <p className="editor-feedback editor-feedback--error" role="alert">{suggestionError}</p>}{suggestion && <section className="resume-summary-proposal" aria-label="Proposition de description"><h3>Proposition à relire</h3><label>Texte proposé<textarea value={suggestion} onChange={(event) => setSuggestion(event.target.value)} rows="4" /></label><div><Button type="button" variant="secondary" onClick={() => { onChange('description', suggestion); setSuggestion('') }}>Utiliser cette proposition</Button><Button type="button" variant="secondary" onClick={() => setSuggestion('')}>Ignorer</Button></div></section>}<Button type="button" onClick={onSave} disabled={isSaving || isOverflow} title={isOverflow ? 'Réduisez le contenu ou la taille du texte pour enregistrer.' : undefined}>{isSaving ? 'Enregistrement…' : 'Enregistrer'}</Button></article>
}

function EducationCard({ item, onChange, onSave, onDelete, onClose, isSaving, isOverflow }) {
  return <article className="resume-section-card resume-section-card--open"><div className="resume-section-card-heading"><button type="button" className="resume-section-collapse" onClick={onClose}><b>Formation</b><ChevronUp size={18} aria-hidden="true" /></button><button type="button" className="section-delete" onClick={onDelete} aria-label="Supprimer la formation"><Trash2 size={15} /> Supprimer</button></div><div className="editor-field-grid"><AutocompleteInput label="Diplôme / Formation" value={item.degree} onChange={(value) => onChange('degree', value)} suggestions={[...educationDegrees, ...educationDomains]} placeholder="Ex. Master · Informatique" /><label>Établissement<input value={item.school} onChange={(event) => onChange('school', event.target.value)} /></label></div><div className="editor-field-grid"><label>Ville<input value={item.city} onChange={(event) => onChange('city', event.target.value)} /></label><label>Date de début<input type="date" lang="fr" value={toInputDate(item.start_date)} onChange={(event) => onChange('start_date', event.target.value)} /></label></div><label>Date de fin<input type="date" lang="fr" value={toInputDate(item.end_date)} onChange={(event) => onChange('end_date', event.target.value)} /></label><label>Description<textarea rows="4" value={item.description || ''} onChange={(event) => onChange('description', event.target.value)} /></label><Button type="button" onClick={onSave} disabled={isSaving || isOverflow} title={isOverflow ? 'Réduisez le contenu ou la taille du texte pour enregistrer.' : undefined}>{isSaving ? 'Enregistrement…' : 'Enregistrer'}</Button></article>
}

export default function ResumeSections({ resumeId, experiences, educations, setExperiences, setEducations, isOverflow = false }) {
  const [savingKey, setSavingKey] = useState('')
  const [openCard, setOpenCard] = useState('')
  const [error, setError] = useState('')
  const cardKey = (kind, id) => kind + ':' + id
  const updateItem = (setItems, key, id, field, value) => setItems((items) => items.map((item) => item[key] === id ? { ...item, [field]: value, ...(field === 'is_current' && value ? { end_date: '' } : {}) } : item))

  async function persistExperience(item) {
    setSavingKey(item.id_experience); setError('')
    try { const result = item.id_experience.startsWith('new-') ? await createExperience(resumeId, item) : await updateExperience(resumeId, item.id_experience, item); setExperiences((items) => items.map((current) => current.id_experience === item.id_experience ? result.experience : current)); setOpenCard('') } catch (requestError) { setError(requestError.message) } finally { setSavingKey('') }
  }
  async function persistEducation(item) {
    setSavingKey(item.id_education); setError('')
    try { const result = item.id_education.startsWith('new-') ? await createEducation(resumeId, item) : await updateEducation(resumeId, item.id_education, item); setEducations((items) => items.map((current) => current.id_education === item.id_education ? result.education : current)); setOpenCard('') } catch (requestError) { setError(requestError.message) } finally { setSavingKey('') }
  }
  async function removeExperience(item) { setError(''); try { if (!item.id_experience.startsWith('new-')) await deleteExperience(resumeId, item.id_experience); setExperiences((items) => items.filter((current) => current.id_experience !== item.id_experience)); setOpenCard('') } catch (requestError) { setError(requestError.message) } }
  async function removeEducation(item) { setError(''); try { if (!item.id_education.startsWith('new-')) await deleteEducation(resumeId, item.id_education); setEducations((items) => items.filter((current) => current.id_education !== item.id_education)); setOpenCard('') } catch (requestError) { setError(requestError.message) } }
  const addExperience = () => { const item = blankExperience(); setExperiences((items) => [...items, item]); setOpenCard(cardKey('experience', item.id_experience)) }
  const addEducation = () => { const item = blankEducation(); setEducations((items) => [...items, item]); setOpenCard(cardKey('education', item.id_education)) }

  return <div className="resume-sections">{error && <p className="editor-feedback editor-feedback--error" role="alert">{error}</p>}<section><div className="resume-section-heading"><div><p>Parcours</p><h2>Expériences</h2></div><button type="button" className="section-add" onClick={addExperience}><CirclePlus size={16} /> Ajouter une expérience</button></div>{experiences.map((item) => openCard === cardKey('experience', item.id_experience) ? <ExperienceCard key={item.id_experience} resumeId={resumeId} item={item} isSaving={savingKey === item.id_experience} isOverflow={isOverflow} onClose={() => setOpenCard('')} onChange={(field, value) => updateItem(setExperiences, 'id_experience', item.id_experience, field, value)} onSave={() => persistExperience(item)} onDelete={() => removeExperience(item)} /> : <CompactCard key={item.id_experience} item={item} kind="experience" onOpen={() => setOpenCard(cardKey('experience', item.id_experience))} onDelete={() => removeExperience(item)} />)}</section><section><div className="resume-section-heading"><div><p>Parcours</p><h2>Formations</h2></div><button type="button" className="section-add" onClick={addEducation}><CirclePlus size={16} /> Ajouter une formation</button></div>{educations.map((item) => openCard === cardKey('education', item.id_education) ? <EducationCard key={item.id_education} item={item} isSaving={savingKey === item.id_education} isOverflow={isOverflow} onClose={() => setOpenCard('')} onChange={(field, value) => updateItem(setEducations, 'id_education', item.id_education, field, value)} onSave={() => persistEducation(item)} onDelete={() => removeEducation(item)} /> : <CompactCard key={item.id_education} item={item} kind="education" onOpen={() => setOpenCard(cardKey('education', item.id_education))} onDelete={() => removeEducation(item)} />)}</section></div>
}
