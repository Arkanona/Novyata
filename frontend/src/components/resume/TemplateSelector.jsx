import TemplateCard from './templates/TemplateCard'

const templates = [
  { id: 'classic', name: 'Classique', description: 'Formel, structuré et intemporel.' },
  { id: 'modern', name: 'Moderne', description: 'Deux colonnes et une lecture dynamique.' },
  { id: 'minimal', name: 'Minimal', description: 'Éditorial, aéré et essentiel.' },
]
const colors = [['#314A67', 'Bleu nuit'], ['#4C627A', 'Bleu ardoise'], ['#3F6B5B', 'Vert'], ['#7A4B4B', 'Bordeaux'], ['#5B5F97', 'Violet'], ['#374151', 'Gris foncé']]

export default function TemplateSelector({ resume, onChange }) {
  const template = resume.template_key || 'classic'
  const accent = resume.accent_color || '#314A67'
  const fontSize = resume.font_size || 'normal'
  return <section className="resume-sections appearance">
    <div className="resume-section-heading"><div><p>Apparence</p><h2>Choisir un modèle</h2><span>Chaque aperçu utilise vos données réelles.</span></div></div>
    <div className="template-selector">{templates.map((item) => <TemplateCard key={item.id} template={item} resume={resume} selected={template === item.id} onSelect={(value) => onChange({ template_key: value })} />)}</div>
    <div className="customization-panel"><div><p>Apparence</p><h2>Personnaliser le CV</h2></div><div className="customization-row"><div><span className="customization-label">Couleur d’accent</span><div className="color-picker">{colors.map(([value, label]) => <button key={value} type="button" aria-label={label} title={label} className={accent === value ? 'active' : ''} style={{ backgroundColor: value }} onClick={() => onChange({ accent_color: value })}><i /></button>)}</div></div><div><span className="customization-label">Taille du texte</span><div className="font-size-selector">{[['small', 'Petit'], ['normal', 'Normal'], ['large', 'Grand']].map(([value, label]) => <button type="button" key={value} className={fontSize === value ? 'active' : ''} onClick={() => onChange({ font_size: value })}>{label}</button>)}</div></div></div></div>
  </section>
}
