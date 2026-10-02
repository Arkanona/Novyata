import { templateById } from './templateRegistry'
const fontScales = { small: 0.9, normal: 1, large: 1.1 }
const lineHeightScales = { small: 0.96, normal: 1, large: 1.04 }
const spacingScales = { small: 0.94, normal: 1, large: 1.06 }
const advancedSpacingScales = { compact: 0.86, normal: 1, airy: 1.18 }
const densityLineScales = { compact: 0.94, normal: 1, airy: 1.08 }

export default function TemplatePreview({ resume, template, compact = false, pdf = false }) {
  const key = template || resume.template_key || 'classic'
  const fontSize = fontScales[resume.font_size] ? resume.font_size : 'normal'
  const contentDensity = ['compact', 'normal', 'airy'].includes(resume.content_density) ? resume.content_density : 'normal'
  const sectionSpacing = ['compact', 'normal', 'airy'].includes(resume.section_spacing) ? resume.section_spacing : 'normal'
  const Template = templateById[key]?.component || templateById.classic.component
  const fontFamily = ['Inter', 'Arial', 'Georgia', 'DM Serif Display'].includes(resume.font_family) ? resume.font_family : 'Inter'
  return <div aria-hidden={compact || undefined} className={'template-preview template-' + key + ' font-' + fontSize + ' density-' + contentDensity + ' section-spacing-' + sectionSpacing + ' heading-' + (resume.heading_style || 'line') + ' divider-' + (resume.divider_style || 'solid') + (compact ? ' template-preview--compact' : '') + (pdf ? ' template-preview--pdf' : '')} style={{ '--resume-accent': resume.accent_color || '#314A67', '--resume-font-scale': fontScales[fontSize], '--resume-line-scale': lineHeightScales[fontSize] * densityLineScales[contentDensity], '--resume-space-scale': spacingScales[fontSize] * advancedSpacingScales[sectionSpacing], '--resume-font-family': fontFamily }}><Template resume={resume} /></div>
}
