import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import HomeFooter from '../components/home/HomeFooter'
import HomeHeader from '../components/home/HomeHeader'
import ModelsGallery from '../components/home/ModelsGallery'
import PublicSeo from '../components/home/PublicSeo'
export default function ModelsPage() { return <main className="public-page"><PublicSeo title="Modèles de CV — Novyata" description="Découvrez les modèles de CV Classique, Moderne et Minimal de Novyata." /><HomeHeader /><section className="public-hero page-width"><p className="home-eyebrow"><span /> Modèles de CV</p><h1>Trois façons sobres de mettre votre parcours en valeur.</h1><p>Classique, Moderne ou Minimal : choisissez une mise en page professionnelle, puis personnalisez votre contenu et votre couleur d’accent.</p><Link className="button button--primary" to="/inscription">Créer mon CV gratuitement <ArrowRight size={16} /></Link></section><ModelsGallery compact /><HomeFooter /></main> }
