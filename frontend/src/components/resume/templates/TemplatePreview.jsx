import ClassicTemplate from './ClassicTemplate'
import ModernTemplate from './ModernTemplate'
import MinimalTemplate from './MinimalTemplate'

const templates = { classic: ClassicTemplate, modern: ModernTemplate, minimal: MinimalTemplate }
const fontScales = { small: 0.9, normal: 1, large: 1.1 }
const lineHeightScales = { small: 0.96, normal: 1, large: 1.04 }
const spacingScales = { small: 0.94, normal: 1, large: 1.06 }

export default function TemplatePreview({ resume, template, compact = false, pdf = false }) {
  const key = template || resume.template_key || 'classic'
  const fontSize = fontScales[resume.font_size] ? resume.font_size : 'normal'
  const Template = templates[key] || ClassicTemplate
  return <div aria-hidden={compact || undefined} className={'template-preview template-' + key + ' font-' + fontSize + (compact ? ' template-preview--compact' : '') + (pdf ? ' template-preview--pdf' : '')} style={{ '--resume-accent': resume.accent_color || '#314A67', '--resume-font-scale': fontScales[fontSize], '--resume-line-scale': lineHeightScales[fontSize], '--resume-space-scale': spacingScales[fontSize] }}><Template resume={resume} /></div>
}
