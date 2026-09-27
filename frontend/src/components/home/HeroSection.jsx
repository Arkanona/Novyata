import { ArrowRight, Play } from 'lucide-react'
import { Link } from 'react-router-dom'
import EditorPreview from './EditorPreview'

export default function HeroSection() {
  return <section className="home-hero page-width">
    <div className="home-hero-copy"><p className="home-eyebrow"><span /> L'essentiel pour votre recherche</p><h1>Créez un CV clair,<br /><em>moderne et professionnel.</em></h1><p className="home-hero-lead">Novyata vous aide à présenter votre parcours avec justesse et à organiser votre recherche d’emploi, en toute simplicité.</p><div className="home-hero-actions"><Link className="button button--primary" to="/inscription">Commencer gratuitement <ArrowRight size={16} /></Link><a className="home-secondary-action" href="#exemple"><Play size={14} fill="currentColor" /> Voir un exemple</a></div><p className="home-reassurance">Sans carte bancaire · Créez votre premier CV en quelques minutes</p></div>
    <EditorPreview />
  </section>
}
