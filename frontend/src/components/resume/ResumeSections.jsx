import { useState } from 'react'
import { CirclePlus, Trash2 } from 'lucide-react'
import Button from '../common/Button'
import { createEducation, createExperience, deleteEducation, deleteExperience, updateEducation, updateExperience } from '../../services/resumeService'

const blankExperience = () => ({ id_experience: 'new-' + Date.now(), job_title: '', company: '', city: '', start_date: '', end_date: '', is_current: false, description: '' })
const blankEducation = () => ({ id_education: 'new-' + Date.now(), degree: '', school: '', city: '', start_date: '', end_date: '', description: '' })
const toInputDate = (date) => date ? String(date).slice(0, 10) : ''

function ExperienceCard({ item, onChange, onSave, onDelete, isSaving }) {
  return <article className="resume-section-card"><div className="resume-section-card-heading"><b>Expérience professionnelle</b><button type="button" className="section-delete" onClick={onDelete} aria-label="Supprimer l’expérience"><Trash2 size={15} /> Supprimer</button></div><div className="editor-field-grid"><label>Poste<input value={item.job_title} onChange={(event) => onChange('job_title', event.target.value)} /></label><label>Entreprise<input value={item.company} onChange={(event) => onChange('company', event.target.value)} /></label></div><div className="editor-field-grid"><label>Ville<input value={item.city} onChange={(event) => onChange('city', event.target.value)} /></label><label>Date de début<input type="date" lang="fr" value={toInputDate(item.start_date)} onChange={(event) => onChange('start_date', event.target.value)} /></label></div><label className="current-job"><input type="checkbox" checked={item.is_current} onChange={(event) => onChange('is_current', event.target.checked)} /> Poste actuel</label>{!item.is_current && <label>Date de fin<input type="date" lang="fr" value={toInputDate(item.end_date)} onChange={(event) => onChange('end_date', event.target.value)} /></label>}<label>Description<textarea rows="4" value={item.description || ''} onChange={(event) => onChange('description', event.target.value)} /></label><Button type="button" onClick={onSave} disabled={isSaving}>{isSaving ? 'Enregistrement…' : 'Enregistrer'}</Button></article>
}

function EducationCard({ item, onChange, onSave, onDelete, isSaving }) {
  return <article className="resume-section-card"><div className="resume-section-card-heading"><b>Formation</b><button type="button" className="section-delete" onClick={onDelete} aria-label="Supprimer la formation"><Trash2 size={15} /> Supprimer</button></div><div className="editor-field-grid"><label>Diplôme<input value={item.degree} onChange={(event) => onChange('degree', event.target.value)} /></label><label>Établissement<input value={item.school} onChange={(event) => onChange('school', event.target.value)} /></label></div><div className="editor-field-grid"><label>Ville<input value={item.city} onChange={(event) => onChange('city', event.target.value)} /></label><label>Date de début<input type="date" lang="fr" value={toInputDate(item.start_date)} onChange={(event) => onChange('start_date', event.target.value)} /></label></div><label>Date de fin<input type="date" lang="fr" value={toInputDate(item.end_date)} onChange={(event) => onChange('end_date', event.target.value)} /></label><label>Description<textarea rows="4" value={item.description || ''} onChange={(event) => onChange('description', event.target.value)} /></label><Button type="button" onClick={onSave} disabled={isSaving}>{isSaving ? 'Enregistrement…' : 'Enregistrer'}</Button></article>
}

export default function ResumeSections({ resumeId, experiences, educations, setExperiences, setEducations }) {
  const [savingKey, setSavingKey] = useState('')
  const [error, setError] = useState('')
  const updateItem = (setItems, key, id, field, value) => setItems((items) => items.map((item) => item[key] === id ? { ...item, [field]: value, ...(field === 'is_current' && value ? { end_date: '' } : {}) } : item))

  async function persistExperience(item) {
    setSavingKey(item.id_experience); setError('')
    try { const result = item.id_experience.startsWith('new-') ? await createExperience(resumeId, item) : await updateExperience(resumeId, item.id_experience, item); setExperiences((items) => items.map((current) => current.id_experience === item.id_experience ? result.experience : current)) } catch (requestError) { setError(requestError.message) } finally { setSavingKey('') }
  }
  async function persistEducation(item) {
    setSavingKey(item.id_education); setError('')
    try { const result = item.id_education.startsWith('new-') ? await createEducation(resumeId, item) : await updateEducation(resumeId, item.id_education, item); setEducations((items) => items.map((current) => current.id_education === item.id_education ? result.education : current)) } catch (requestError) { setError(requestError.message) } finally { setSavingKey('') }
  }
  async function removeExperience(item) { setError(''); try { if (!item.id_experience.startsWith('new-')) await deleteExperience(resumeId, item.id_experience); setExperiences((items) => items.filter((current) => current.id_experience !== item.id_experience)) } catch (requestError) { setError(requestError.message) } }
  async function removeEducation(item) { setError(''); try { if (!item.id_education.startsWith('new-')) await deleteEducation(resumeId, item.id_education); setEducations((items) => items.filter((current) => current.id_education !== item.id_education)) } catch (requestError) { setError(requestError.message) } }

  return <div className="resume-sections">{error && <p className="editor-feedback editor-feedback--error" role="alert">{error}</p>}<section><div className="resume-section-heading"><div><p>Parcours</p><h2>Expériences</h2></div><button type="button" className="section-add" onClick={() => setExperiences((items) => [...items, blankExperience()])}><CirclePlus size={16} /> Ajouter une expérience</button></div>{experiences.map((item) => <ExperienceCard key={item.id_experience} item={item} isSaving={savingKey === item.id_experience} onChange={(field, value) => updateItem(setExperiences, 'id_experience', item.id_experience, field, value)} onSave={() => persistExperience(item)} onDelete={() => removeExperience(item)} />)}</section><section><div className="resume-section-heading"><div><p>Parcours</p><h2>Formations</h2></div><button type="button" className="section-add" onClick={() => setEducations((items) => [...items, blankEducation()])}><CirclePlus size={16} /> Ajouter une formation</button></div>{educations.map((item) => <EducationCard key={item.id_education} item={item} isSaving={savingKey === item.id_education} onChange={(field, value) => updateItem(setEducations, 'id_education', item.id_education, field, value)} onSave={() => persistEducation(item)} onDelete={() => removeEducation(item)} />)}</section></div>
}
