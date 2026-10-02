import { Link } from 'react-router-dom'
import { templateRegistry, templateAvailableForPlan } from './templates/templateRegistry'
import { hasPlanCapability } from '../../config/planCapabilities'
import TemplateCard from './templates/TemplateCard'

const freeColors = [['#314A67', 'Bleu nuit'], ['#4C627A', 'Bleu ardoise'], ['#3F6B5B', 'Vert'], ['#7A4B4B', 'Bordeaux'], ['#5B5F97', 'Violet'], ['#374151', 'Gris foncé']]
const proColors = [['#2F6B65', 'Sarcelle'], ['#6F5A46', 'Bronze'], ['#8A5A74', 'Prune'], ['#A7633B', 'Terracotta']]
const controls = {
  font_family: ['Inter', 'Arial', 'Georgia', 'DM Serif Display'],
  content_density: ['compact', 'normal', 'airy'],
  section_spacing: ['compact', 'normal', 'airy'],
  heading_style: ['line', 'plain', 'filled'],
  divider_style: ['solid', 'dashed', 'dotted'],
}
const labels = { compact: 'Compacte', normal: 'Normale', airy: 'Aérée', line: 'Ligne', plain: 'Épuré', filled: 'Accentué', solid: 'Continue', dashed: 'Tirets', dotted: 'Pointillée' }

function SegmentedSetting({ label, name, value, options, onChange }) {
  return <div className="advanced-setting"><span className="customization-label">{label}</span><div className="advanced-setting-options">{options.map((option) => <button type="button" key={option} className={value === option ? 'active' : ''} aria-pressed={value === option} onClick={() => onChange({ [name]: option })}>{labels[option] || option}</button>)}</div></div>
}

export default function TemplateSelector({ resume, onChange, plan = 'free' }) {
  const template = resume.template_key || 'classic'
  const accent = resume.accent_color || '#314A67'
  const fontSize = resume.font_size || 'normal'
  const hasAdvancedCustomization = hasPlanCapability(plan, 'advancedCustomization')
  const colors = hasAdvancedCustomization ? [...freeColors, ...proColors] : freeColors
  return <section className="resume-sections appearance">
    <div className="resume-section-heading"><div><p>Apparence</p><h2>Choisir un modèle</h2><span>Chaque aperçu utilise vos données réelles.</span></div></div>
    <div className="template-selector">{templateRegistry.map((item) => <TemplateCard key={item.id} template={item} resume={resume} selected={template === item.id} canUse={templateAvailableForPlan(item.id, plan)} onSelect={(value) => onChange({ template_key: value })} />)}</div>
    <div className="customization-panel"><div><p>Apparence</p><h2>Personnaliser le CV</h2></div><div className="customization-row"><div><span className="customization-label">Couleur d’accent</span><div className="color-picker">{colors.map(([value, label]) => <button key={value} type="button" aria-label={label} title={label} className={accent === value ? 'active' : ''} style={{ backgroundColor: value }} onClick={() => onChange({ accent_color: value })}><i /></button>)}</div>{!hasAdvancedCustomization && <small className="pro-customization-note">4 couleurs supplémentaires avec Novyata Pro.</small>}</div><div><span className="customization-label">Taille du texte</span><div className="font-size-selector">{[['small', 'Petit'], ['normal', 'Normal'], ['large', 'Grand']].map(([value, label]) => <button type="button" key={value} className={fontSize === value ? 'active' : ''} aria-pressed={fontSize === value} onClick={() => onChange({ font_size: value })}>{label}</button>)}</div></div></div>{hasAdvancedCustomization ? <div className="advanced-customization-grid"><SegmentedSetting label="Police" name="font_family" value={resume.font_family || 'Inter'} options={controls.font_family} onChange={onChange} /><SegmentedSetting label="Densité du contenu" name="content_density" value={resume.content_density || 'normal'} options={controls.content_density} onChange={onChange} /><SegmentedSetting label="Espacement des sections" name="section_spacing" value={resume.section_spacing || 'normal'} options={controls.section_spacing} onChange={onChange} /><SegmentedSetting label="Style des titres" name="heading_style" value={resume.heading_style || 'line'} options={controls.heading_style} onChange={onChange} /><SegmentedSetting label="Séparateurs" name="divider_style" value={resume.divider_style || 'solid'} options={controls.divider_style} onChange={onChange} /></div> : <Link className="pro-customization-cta" to="/tarifs">Découvrir la personnalisation avancée avec Novyata Pro</Link>}</div>
  </section>
}
