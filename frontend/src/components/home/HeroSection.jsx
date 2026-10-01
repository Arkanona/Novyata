import { ArrowRight, Play } from 'lucide-react'
import { Link } from 'react-router-dom'
import EditorPreview from './EditorPreview'

export default function HeroSection() {
  return <section className="home-hero page-width">
    <div className="home-hero-copy"><p className="home-eyebrow"><span /> L’essentiel pour votre recherche</p><h1>Créez un CV clair,<br /><em>moderne et professionnel.</em></h1><p className="home-hero-lead">Créez vos documents, analysez les offres et suivez vos candidatures depuis un seul espace.</p><div className="home-hero-actions"><Link className="button button--primary" to="/inscription">Créer mon CV gratuitement <ArrowRight size={16} /></Link><a className="home-secondary-action" href="#decouvrir"><Play size={14} fill="currentColor" /> Découvrir Novyata</a></div><p className="home-reassurance">Sans carte bancaire · Vos documents restent sous votre contrôle</p></div>
    <EditorPreview />
  </section>
}
