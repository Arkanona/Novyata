import { useEffect, useState } from 'react'
import { FilePlus2, Pencil, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import Button from '../components/common/Button'
import { deleteCoverLetter, getCoverLetters } from '../services/coverLetterService'

function formatDate(date) {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(date))
}

export default function CoverLetterListPage() {
  const [letters, setLetters] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [pendingDeletion, setPendingDeletion] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => { getCoverLetters().then(({ cover_letters }) => setLetters(cover_letters)).catch((requestError) => setError(requestError.message)).finally(() => setIsLoading(false)) }, [])

  async function removeLetter() {
    if (!pendingDeletion) return
    setIsDeleting(true)
    try {
      await deleteCoverLetter(pendingDeletion.id_cover_letter)
      setLetters((current) => current.filter((letter) => letter.id_cover_letter !== pendingDeletion.id_cover_letter))
      setPendingDeletion(null)
    } catch (requestError) { setError(requestError.message) } finally { setIsDeleting(false) }
  }

  return <main className="app-page cover-letter-list-page"><header className="app-header"><div><p className="crumb">Vos candidatures</p><h1>Lettres de motivation</h1></div><Link to="/lettres/nouvelle"><Button><FilePlus2 size={17} /> Créer une lettre</Button></Link></header>
    {isLoading && <div className="dashboard-feedback">Chargement de vos lettres…</div>}
    {error && <div className="dashboard-feedback dashboard-feedback--error" role="alert">{error}</div>}
    {!isLoading && !error && letters.length === 0 && <section className="cover-letter-empty"><FilePlus2 size={25} /><h2>Vous n’avez encore aucune lettre.</h2><p>Préparez une lettre de motivation claire et personnalisée pour votre prochaine candidature.</p><Link to="/lettres/nouvelle"><Button>Créer une lettre</Button></Link></section>}
    {!isLoading && letters.length > 0 && <section className="cover-letter-grid">{letters.map((letter) => <article className="cover-letter-card" key={letter.id_cover_letter}><div className="cover-letter-card__paper"><span>{letter.template === 'modern' ? 'MODERNE' : 'CLASSIQUE'}</span><i /><i /><i /></div><div className="cover-letter-card__content"><p>{letter.company_name || 'Entreprise non renseignée'}</p><h2>{letter.title}</h2><span>{letter.job_title || 'Poste non renseigné'}</span><small>Modifiée le {formatDate(letter.updated_at)}</small></div><div className="cover-letter-card__actions"><Link to={'/lettres/' + letter.id_cover_letter} aria-label={'Modifier ' + letter.title}><Pencil size={16} /> Modifier</Link><button type="button" onClick={() => setPendingDeletion(letter)} aria-label={'Supprimer ' + letter.title}><Trash2 size={16} /></button></div></article>)}</section>}
    {pendingDeletion && <div className="confirmation-backdrop" role="presentation"><section className="confirmation-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-letter-title"><h2 id="delete-letter-title">Supprimer cette lettre ?</h2><p>Cette action supprimera définitivement « {pendingDeletion.title} ».</p><div className="confirmation-actions"><button type="button" className="confirmation-cancel" onClick={() => setPendingDeletion(null)} disabled={isDeleting}>Annuler</button><Button type="button" variant="danger" onClick={removeLetter} disabled={isDeleting}>{isDeleting ? 'Suppression…' : 'Supprimer définitivement'}</Button></div></section></div>}
  </main>
}
