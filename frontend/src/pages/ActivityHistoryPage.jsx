import { useEffect, useState } from 'react'
import { ArrowUpRight, History } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getActivityHistory } from '../services/activityService'
import { useAuth } from '../store/AuthContext'

function formatDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export default function ActivityHistoryPage() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(user?.plan === 'pro')
  const [error, setError] = useState('')
  useEffect(() => {
    if (user?.plan !== 'pro') { setLoading(false); return }
    getActivityHistory().then((result) => setItems(result.activity || [])).catch((requestError) => setError(requestError.message)).finally(() => setLoading(false))
  }, [user?.plan])

  return <main className="app-page activity-history-page">
    <header className="app-header"><div><p className="crumb">Novyata Pro</p><h1>Historique complet</h1><p>Retrouvez vos analyses, lettres, variantes de CV, simulations et relances.</p></div></header>
    {user?.plan !== 'pro' ? <section className="pro-feature-locked activity-history-locked"><div><History size={21} /><h2>Gardez une vue d’ensemble de votre recherche</h2><p>L’historique complet est disponible avec Novyata Pro.</p></div><Link className="button button--primary" to="/tarifs">Découvrir Pro <ArrowUpRight size={16} /></Link></section>
      : loading ? <p className="dashboard-feedback" role="status">Chargement de votre historique…</p>
        : error ? <p className="dashboard-feedback dashboard-feedback--error" role="alert">{error}</p>
          : items.length === 0 ? <section className="dashboard-empty"><History size={22} /><h2>Aucune activité pour le moment</h2><p>Vos documents et préparations apparaîtront ici au fil de votre recherche.</p></section>
            : <ol className="activity-history-list">{items.map((item) => <li key={`${item.kind}:${item.id}`}><span className="activity-history-marker" aria-hidden="true" /><div><p>{item.kind}</p><h2>{item.title}</h2>{item.subtitle && <span>{item.subtitle}</span>}<time dateTime={item.date}>{formatDate(item.date)}</time></div><Link to={item.href} aria-label={`Ouvrir ${item.title}`}><ArrowUpRight size={17} /></Link></li>)}</ol>}
  </main>
}
