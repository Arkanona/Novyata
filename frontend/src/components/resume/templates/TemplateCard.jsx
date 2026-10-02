import TemplatePreview from './TemplatePreview'
import { Link } from 'react-router-dom'

export default function TemplateCard({ template, resume, selected, canUse, onSelect }) {
  return <article className={'template-card' + (selected ? ' template-card--selected' : '')}>
    <span className="template-card__thumbnail" aria-hidden="true"><TemplatePreview template={template.id} resume={resume} compact /></span>
    <span className="template-card__details"><span><b>{template.name}</b><small>{template.description}</small></span><span className="template-card__badges">{template.plan === 'pro' && <em className="template-card__pro">Pro</em>}{selected && <em>✓ Sélectionné</em>}</span></span>
    {canUse
      ? <button type="button" className="template-card__action" aria-pressed={selected} onClick={() => onSelect(template.id)}>{selected ? 'Modèle actuel' : 'Utiliser ce modèle'}</button>
      : <Link className="template-card__action template-card__action--upgrade" to="/tarifs">Débloquer avec Novyata Pro</Link>}
  </article>
}
