import { useEffect, useMemo, useState } from 'react'
import { BriefcaseBusiness, CirclePlus, Pencil, Search, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import Button from '../components/common/Button'
import ApplicationStatusBadge from '../components/applications/ApplicationStatusBadge'
import { applicationStatuses, deleteApplication, getApplications } from '../services/applicationService'

function formatDate(date) { return date ? new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date)) : 'Non renseignée' }

export default function ApplicationListPage() {
  const [applications, setApplications] = useState([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState('recent')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { getApplications().then(({ applications: list }) => setApplications(list)).catch((requestError) => setError(requestError.message)).finally(() => setIsLoading(false)) }, [])
  const filtered = useMemo(() => applications.filter((application) => {
    const needle = search.trim().toLowerCase()
    return (!status || application.status === status) && (!needle || [application.company_name, application.job_title].some((value) => value?.toLowerCase().includes(needle)))
  }).sort((first, second) => {
    const firstDate = new Date(sort === 'recent' ? (first.updated_at || first.application_date) : first.application_date || first.updated_at).getTime()
    const secondDate = new Date(sort === 'recent' ? (second.updated_at || second.application_date) : second.application_date || second.updated_at).getTime()
    return sort === 'oldest' ? firstDate - secondDate : secondDate - firstDate
  }), [applications, search, status, sort])
  async function remove(application) {
    if (!window.confirm(`Supprimer la candidature chez ${application.company_name} ?`)) return
    try { await deleteApplication(application.id_application); setApplications((items) => items.filter((item) => item.id_application !== application.id_application)) } catch (requestError) { setError(requestError.message) }
  }

  return <main className="app-page applications-page"><header className="app-header"><div><p className="crumb">Votre recherche d’emploi</p><h1>Candidatures</h1></div><Link to="/candidatures/nouvelle"><Button><CirclePlus size={17} /> Ajouter une candidature</Button></Link></header>
    {isLoading && <div className="dashboard-feedback">Chargement de vos candidatures…</div>}{error && <div className="dashboard-feedback dashboard-feedback--error" role="alert">{error}</div>}
    {!isLoading && !error && applications.length === 0 && <section className="applications-empty"><BriefcaseBusiness size={27} /><h2>Vous n’avez encore aucune candidature.</h2><p>Ajoutez une première candidature pour suivre vos démarches simplement.</p><Link to="/candidatures/nouvelle"><Button>Ajouter une candidature</Button></Link></section>}
    {!isLoading && applications.length > 0 && <><section className="application-filters"><label><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher une entreprise ou un poste" /></label><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Tous les statuts</option>{applicationStatuses.map((item) => <option key={item} value={item}>{item}</option>)}</select><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="recent">Modifiées récemment</option><option value="oldest">Date de candidature</option></select></section><section className="applications-table" aria-label="Liste des candidatures"><div className="applications-table__head"><span>Entreprise</span><span>Statut</span><span>Date</span><span>Localisation</span><span>Dernière modification</span><span /></div>{filtered.map((application) => <article className="applications-table__row" key={application.id_application}><div><b>{application.company_name}</b><small>{application.job_title}</small></div><ApplicationStatusBadge status={application.status} /><span>{formatDate(application.application_date)}</span><span>{application.location || '—'}</span><span>{formatDate(application.updated_at)}</span><div className="applications-table__actions"><Link to={'/candidatures/' + application.id_application} aria-label={'Modifier ' + application.company_name}><Pencil size={16} /></Link><button type="button" onClick={() => remove(application)} aria-label={'Supprimer ' + application.company_name}><Trash2 size={16} /></button></div></article>)}{filtered.length === 0 && <p className="applications-no-result">Aucune candidature ne correspond à vos filtres.</p>}</section></>}
  </main>
}
