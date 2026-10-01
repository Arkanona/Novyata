import { ArrowRight } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/AuthContext'
import TemplatePreview from '../resume/templates/TemplatePreview'
import { sampleResume } from './marketingData'

const models = [{ id: 'classic', name: 'Classique', text: 'Structuré et intemporel.' }, { id: 'modern', name: 'Moderne', text: 'Équilibré et expressif.' }, { id: 'minimal', name: 'Minimal', text: 'Simple et très lisible.' }]
export default function ModelsGallery({ compact = false }) {
  const { isAuthenticated } = useAuth(); const navigate = useNavigate()
  const choose = (model) => navigate(isAuthenticated ? `/cv/nouveau?template=${model}` : `/inscription?template=${model}`)
  return <section className={'marketing-section models-showcase' + (compact ? ' models-showcase--compact' : '')}><div className="page-width"><div className="marketing-heading"><div><p className="home-eyebrow"><span /> Trois modèles, un rendu professionnel</p><h2>Un modèle qui laisse votre parcours parler.</h2></div>{!compact && <Link className="home-inline-link" to="/modeles">Voir les modèles <ArrowRight size={16} /></Link>}</div><div className="models-grid">{models.map((model) => <article key={model.id}><div className="model-paper"><TemplatePreview resume={sampleResume} template={model.id} compact /></div><div><h3>{model.name}</h3><p>{model.text}</p><button type="button" onClick={() => choose(model.id)}>Utiliser ce modèle <ArrowRight size={14} /></button></div></article>)}</div></div></section>
}
