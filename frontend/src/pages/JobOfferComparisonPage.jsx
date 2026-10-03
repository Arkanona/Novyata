import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { compareSavedOffers } from '../services/jobAnalysisService'

function display(value) { return value || 'Non précisé dans l’offre' }

export default function JobOfferComparisonPage() {
  const [searchParams] = useSearchParams()
  const ids = [...new Set((searchParams.get('ids') || '').split(',').filter(Boolean))]
  const [offers, setOffers] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (ids.length < 2 || ids.length > 3) { setError('Choisissez deux ou trois analyses depuis votre historique.'); setLoading(false); return }
    compareSavedOffers(ids).then(({ offers: result }) => setOffers(result)).catch((requestError) => setError(requestError.message)).finally(() => setLoading(false))
  }, [searchParams.toString()])
  const rows = [
    ['Entreprise', (offer) => display(offer.companyName)], ['Poste', (offer) => display(offer.jobTitle)], ['Localisation', (offer) => display(offer.location)],
    ['Contrat', (offer) => display(offer.contractType)], ['Télétravail', (offer) => display(offer.remote)], ['Salaire', (offer) => display(offer.salary)],
    ['Correspondance estimée', (offer) => offer.matchScore == null ? 'Non estimée' : `${offer.matchScore}%`],
    ['Compétences / exigences principales', (offer) => offer.importantRequirements.length ? offer.importantRequirements.join(', ') : 'Non précisées'],
    ['Avantages explicitement indiqués', (offer) => offer.explicitBenefits.length ? offer.explicitBenefits.join(' · ') : 'Non précisés'],
  ]
  return <main className="app-page job-offer-comparison"><header className="app-header"><div><p className="crumb">Vos offres enregistrées</p><h1>Comparer des offres</h1></div><Link className="button button--secondary" to="/analyses">Retour aux analyses</Link></header>{loading && <p role="status">Chargement de la comparaison…</p>}{error && <p className="editor-feedback editor-feedback--error" role="alert">{error}</p>}{!loading && !error && offers.length > 0 && <><p className="job-offer-comparison__note">Comparaison neutre à partir des informations présentes dans les offres et analyses. Les informations absentes sont signalées comme non précisées.</p><div className="job-offer-comparison__table-wrap"><table><thead><tr><th scope="col">Critère</th>{offers.map((offer) => <th scope="col" key={offer.id}>{offer.companyName || offer.jobTitle || 'Offre'}</th>)}</tr></thead><tbody>{rows.map(([label, value]) => <tr key={label}><th scope="row">{label}</th>{offers.map((offer) => <td key={offer.id}>{value(offer)}</td>)}</tr>)}</tbody></table></div></>}</main>
}
