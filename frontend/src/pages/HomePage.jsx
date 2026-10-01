import DashboardPreview from '../components/home/DashboardPreview'
import { AnalysisSection, ApplicationsSection, FeatureOverview, JourneySection } from '../components/home/MarketingSections'
import ModelsGallery from '../components/home/ModelsGallery'
import PricingPreview from '../components/home/PricingPreview'
import PublicSeo from '../components/home/PublicSeo'
import HeroSection from '../components/home/HeroSection'
import HomeFooter from '../components/home/HomeFooter'
import HomeHeader from '../components/home/HomeHeader'
import { Link } from 'react-router-dom'

export default function HomePage() {
  return <main className="landing home"><PublicSeo title="Novyata — CV, lettres et suivi de candidatures" description="Créez vos CV et lettres, analysez les offres et suivez vos candidatures avec Novyata." /><HomeHeader /><HeroSection /><FeatureOverview /><JourneySection /><div id="decouvrir"><DashboardPreview /></div><ModelsGallery /><AnalysisSection /><ApplicationsSection /><PricingPreview /><section className="marketing-final"><div className="page-width"><p className="home-eyebrow"><span /> Prêt à commencer</p><h2>Votre recherche d’emploi, mieux organisée.</h2><p>Préparez votre prochain CV et gardez chaque candidature à portée de main.</p><Link className="button button--primary" to="/inscription">Créer mon CV gratuitement</Link></div></section><HomeFooter /></main>
}
