import TemplatePreview from './TemplatePreview'

export default function TemplateCard({ template, resume, selected, onSelect }) {
  return <button type="button" className={'template-card' + (selected ? ' template-card--selected' : '')} aria-pressed={selected} onClick={() => onSelect(template.id)}>
    <span className="template-card__thumbnail"><TemplatePreview template={template.id} resume={resume} compact /></span>
    <span className="template-card__details"><span><b>{template.name}</b><small>{template.description}</small></span>{selected && <em>✓ Sélectionné</em>}</span>
  </button>
}
