import { ArrowRight, CirclePlus, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import Button from '../common/Button'

export default function EmptyDashboard() {
  return <div className="app-page">
    <header className="app-header"><div><p className="crumb">Bonjour</p><h1>Vue d'ensemble</h1></div><Link to="/cv/nouveau"><Button><CirclePlus size={17} /> Nouveau CV</Button></Link></header>
    <section className="dashboard-welcome">
      <span className="feature-icon"><FileText size={20} /></span>
      <div><h2>Bienvenue dans votre espace Novyata</h2><p>Créez votre premier CV, puis retrouvez ici vos documents et l’avancée de vos candidatures.</p></div>
      <Link to="/cv/nouveau" className="welcome-action">Créer mon premier CV <ArrowRight size={16} /></Link>
    </section>
  </div>
}
