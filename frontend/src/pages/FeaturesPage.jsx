import { ArrowRight, BriefcaseBusiness, FileText, FileDown, Mail, ScanSearch, Sparkles, WandSparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import HomeFooter from '../components/home/HomeFooter'
import HomeHeader from '../components/home/HomeHeader'
import PublicSeo from '../components/home/PublicSeo'

const items = [
  [FileText, 'CV et modèles', 'Composez un CV à partir de vos informations, choisissez un modèle et gardez un aperçu A4 en direct.'],
  [FileDown, 'Export PDF', 'Téléchargez un CV fidèle à votre aperçu lorsque votre contenu tient sur une page A4.'],
  [Mail, 'Lettres de motivation', 'Rédigez, liez et exportez vos lettres depuis le même espace que vos CV.'],
  [BriefcaseBusiness, 'Suivi des candidatures', 'Consignez chaque opportunité, son statut, vos documents et vos notes utiles.'],
  [ScanSearch, 'Analyse d’offre', 'Comprenez les correspondances, les mots-clés et les points à mieux présenter.'],
  [WandSparkles, 'Adaptation de CV', 'Créez une copie adaptée à une offre et choisissez les propositions à appliquer.'],
]
export default function FeaturesPage() { return <main className="public-page"><PublicSeo title="Fonctionnalités Novyata — CV et recherche d’emploi" description="Découvrez les outils Novyata pour créer vos documents et organiser votre recherche d’emploi." /><HomeHeader /><section className="public-hero page-width"><p className="home-eyebrow"><span /> Novyata au quotidien</p><h1>Les bons outils pour préparer chaque candidature avec méthode.</h1><p>CV, lettres, candidatures et analyses sont réunis dans un espace calme, clair et conçu pour vous laisser la main.</p><Link className="button button--primary" to="/inscription">Créer mon CV gratuitement <ArrowRight size={16} /></Link></section><section className="page-width feature-page-grid">{items.map(([Icon, title, text]) => <article key={title}><span><Icon size={21} /></span><h2>{title}</h2><p>{text}</p></article>)}</section><section className="public-callout"><div className="page-width"><Sparkles size={19} /><div><h2>Un espace qui s’adapte à votre méthode.</h2><p>Les fonctionnalités IA proposent des pistes. Vous choisissez toujours ce que vous gardez.</p></div><Link to="/tarifs">Voir les plans</Link></div></section><HomeFooter /></main> }
