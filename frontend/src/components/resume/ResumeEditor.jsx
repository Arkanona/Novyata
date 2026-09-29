import { useCallback, useEffect, useRef, useState } from 'react'
import PersonalInfoForm from './PersonalInfoForm'
import ResumePreview from './ResumePreview'
import ResumeSections from './ResumeSections'
import ResumeTags from './ResumeTags'
import TemplateSelector from './TemplateSelector'
import { updateResume } from '../../services/resumeService'
import { exportResumePdf, PDF_OVERFLOW_MESSAGE } from '../../services/pdfExport'
import Button from '../common/Button'

const editableFields = ['first_name', 'last_name', 'job_title', 'email', 'phone', 'city', 'summary', 'template_key', 'accent_color', 'font_size']
const defaults = { template_key: 'classic', accent_color: '#314A67', font_size: 'normal' }
export const RESUME_OVERFLOW_WARNING = 'Votre CV dépasse une page A4. Réduisez certaines descriptions ou choisissez une taille de texte plus compacte.'

export default function ResumeEditor({ resume, onSaved }) {
  const toForm = (current) => Object.fromEntries(editableFields.map((field) => [field, current[field] || defaults[field] || '']))
  const [form, setForm] = useState(() => toForm(resume))
  const [errors, setErrors] = useState({})
  const [feedback, setFeedback] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const [experiences, setExperiences] = useState(resume.experiences || [])
  const [educations, setEducations] = useState(resume.educations || [])
  const [skills, setSkills] = useState(resume.skills || [])
  const [languages, setLanguages] = useState(resume.languages || [])
  const [hasVerticalOverflow, setHasVerticalOverflow] = useState(false)
  const pendingAppearanceRef = useRef(null)
  const saveRef = useRef(null)

  useEffect(() => { setForm(toForm(resume)); setExperiences(resume.experiences || []); setEducations(resume.educations || []); setSkills(resume.skills || []); setLanguages(resume.languages || []) }, [resume])
  function handleChange(event) { const { name, value } = event.target; setForm((current) => ({ ...current, [name]: value })); setErrors((current) => ({ ...current, [name]: '' })); setFeedback('') }
  async function save(data, { showSuccess = true } = {}) { setIsSaving(true); setFeedback(''); try { const { resume: updated } = await updateResume(resume.id_resume, data); setForm(toForm(updated)); onSaved({ ...resume, ...updated, experiences, educations, skills, languages }); if (showSuccess) setFeedback('Modifications enregistrées.') } catch (error) { setErrors(error.details || {}); setFeedback(error.message) } finally { setIsSaving(false) } }
  saveRef.current = save
  function handleSubmit(event) { event.preventDefault(); if (hasVerticalOverflow) { setFeedback(RESUME_OVERFLOW_WARNING); return } save(form) }
  function saveAppearance(patch) { const next = { ...form, ...patch }; pendingAppearanceRef.current = next; setForm(next); setFeedback('') }
  const previewResume = { ...form, experiences, educations, skills, languages }
  const handleOverflowChange = useCallback((nextValue) => {
    setHasVerticalOverflow(nextValue)
    const pendingAppearance = pendingAppearanceRef.current
    if (!pendingAppearance) return
    pendingAppearanceRef.current = null
    if (!nextValue) saveRef.current?.(pendingAppearance, { showSuccess: false })
  }, [])
  async function handlePdfExport() {
    if (hasVerticalOverflow) { setExportError(RESUME_OVERFLOW_WARNING); return }
    setIsExporting(true)
    setExportError('')
    try { await exportResumePdf({ ...resume, ...previewResume }) } catch (error) { setExportError(error.code === 'PDF_CONTENT_OVERFLOW' ? PDF_OVERFLOW_MESSAGE : (error.message || 'La génération du PDF a échoué.')) } finally { setIsExporting(false) }
  }
  return <div className="resume-editor-layout"><div className="resume-editor-panel"><PersonalInfoForm form={form} errors={errors} isSaving={isSaving} isOverflow={hasVerticalOverflow} onChange={handleChange} onSubmit={handleSubmit} />{feedback && <p className={Object.keys(errors).some((key) => errors[key]) ? 'editor-feedback editor-feedback--error' : 'editor-feedback'} role="status">{feedback}</p>}{hasVerticalOverflow && <p className="editor-feedback editor-feedback--warning" role="alert">{RESUME_OVERFLOW_WARNING}</p>}<TemplateSelector resume={previewResume} onChange={saveAppearance} /><ResumeSections resumeId={resume.id_resume} experiences={experiences} educations={educations} setExperiences={setExperiences} setEducations={setEducations} isOverflow={hasVerticalOverflow} /><ResumeTags resumeId={resume.id_resume} skills={skills} languages={languages} experiences={experiences} setSkills={setSkills} setLanguages={setLanguages} isOverflow={hasVerticalOverflow} /></div><div className="resume-preview-with-action"><ResumePreview resume={previewResume} onOverflowChange={handleOverflowChange} /><div className="pdf-export-action"><Button type="button" onClick={handlePdfExport} disabled={isExporting || isSaving || hasVerticalOverflow} title={hasVerticalOverflow ? 'Réduisez le contenu ou la taille du texte avant l’export.' : undefined}>{isExporting ? 'Génération du PDF…' : 'Télécharger en PDF'}</Button>{exportError && <p className="editor-feedback editor-feedback--error" role="alert">{exportError}</p>}</div></div></div>
}
