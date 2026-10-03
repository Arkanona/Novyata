import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Logo from '../components/common/Logo'
import { getPublicPortfolio } from '../services/portfolioService'

export default function PublicPortfolioPage() {
  const { slug } = useParams()
  const [portfolio, setPortfolio] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => { getPublicPortfolio(slug).then((result) => setPortfolio(result.portfolio)).catch((requestError) => setError(requestError.message)) }, [slug])
  if (error) return <main className="public-portfolio-page"><Logo /><section><h1>Portfolio introuvable</h1><p>Ce portfolio n’existe pas ou n’est pas publié.</p><Link to="/">Découvrir Novyata</Link></section></main>
  if (!portfolio) return <main className="public-portfolio-page"><p role="status">Chargement du portfolio…</p></main>
  return <main className="public-portfolio-page"><header><Logo /><small>Portfolio partagé avec Novyata</small></header><article><div className="public-portfolio-hero">{portfolio.name && <h1>{portfolio.name}</h1>}{portfolio.jobTitle && <p>{portfolio.jobTitle}</p>}{portfolio.summary && <div>{portfolio.summary}</div>}</div>{portfolio.experiences?.length > 0 && <section><h2>Expériences</h2>{portfolio.experiences.map((item, index) => <div key={`${item.job_title}-${item.company}-${index}`}><h3>{item.job_title}</h3><p>{[item.company, item.city].filter(Boolean).join(' · ')}</p>{item.description && <div>{item.description}</div>}</div>)}</section>}{portfolio.educations?.length > 0 && <section><h2>Formations</h2>{portfolio.educations.map((item, index) => <div key={`${item.degree}-${item.school}-${index}`}><h3>{item.degree}</h3><p>{[item.school, item.city].filter(Boolean).join(' · ')}</p>{item.description && <div>{item.description}</div>}</div>)}</section>}{portfolio.skills?.length > 0 && <section><h2>Compétences</h2><ul>{portfolio.skills.map((item, index) => <li key={`${item.name}-${index}`}>{item.name}{item.level ? ` · ${item.level}` : ''}</li>)}</ul></section>}{portfolio.languages?.length > 0 && <section><h2>Langues</h2><ul>{portfolio.languages.map((item, index) => <li key={`${item.name}-${index}`}>{item.name}{item.level ? ` · ${item.level}` : ''}</li>)}</ul></section>}{portfolio.customSections?.map((item, index) => <section key={`${item.title}-${index}`}><h2>{item.title}</h2><div>{item.content}</div></section>)}</article><footer><span>Créé avec</span><Logo /></footer></main>
}
