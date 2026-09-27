import { ArrowRight, CirclePlus, MoreHorizontal } from 'lucide-react'
import { Link } from 'react-router-dom'

const cards = ['Product Designer', 'UX Designer', 'Design Lead']

export default function DashboardPreview() {
  return <section className="home-dashboard-section" id="modeles"><div className="page-width home-dashboard-layout"><div className="home-dashboard-copy"><p className="home-eyebrow"><span /> Tout sous contrôle</p><h2>Vos documents,<br />toujours à portée de main.</h2><p>Retrouvez vos CV, dupliquez un modèle et gardez un œil sur les étapes importantes de votre recherche.</p><Link to="/inscription" className="home-inline-link">Créer mon espace <ArrowRight size={16} /></Link></div><div className="dashboard-demo"><div className="dashboard-demo-header"><div><small>Bonjour Marie</small><b>Vue d’ensemble</b></div><button><CirclePlus size={14} /> Nouveau CV</button></div><div className="dashboard-demo-content"><div className="dashboard-cv-area"><div className="dashboard-demo-title"><b>Mes CV</b><small>3 documents</small></div><div className="dashboard-cv-grid">{cards.map((title, index) => <article key={title}><div className={'dashboard-paper paper-' + (index + 1)}><span>MARIE<br />LAURENT</span><i /><i /><i /></div><b>{title}</b><small>Modifié récemment</small><MoreHorizontal size={15} /></article>)}</div></div><aside className="dashboard-stats"><b>Mes candidatures</b><div><span>En cours</span><strong>8</strong></div><div><span>Entretiens</span><strong>4</strong></div><p><i /> 3 réponses cette semaine</p></aside></div></div></div></section>
}
