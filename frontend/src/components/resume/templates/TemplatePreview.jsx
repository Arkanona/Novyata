import ClassicTemplate from './ClassicTemplate'
import ModernTemplate from './ModernTemplate'
import MinimalTemplate from './MinimalTemplate'

const templates = { classic: ClassicTemplate, modern: ModernTemplate, minimal: MinimalTemplate }

export default function TemplatePreview({ resume, template, compact = false, pdf = false }) {
  const key = template || resume.template_key || 'classic'
  const Template = templates[key] || ClassicTemplate
  return <div aria-hidden={compact || undefined} className={'template-preview template-' + key + ' font-' + (resume.font_size || 'normal') + (compact ? ' template-preview--compact' : '') + (pdf ? ' template-preview--pdf' : '')} style={{ '--resume-accent': resume.accent_color || '#314A67' }}><Template resume={resume} /></div>
}
