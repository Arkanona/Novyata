import { useEffect, useState } from 'react'
import { Copy, Link2, ShieldCheck, Trash2 } from 'lucide-react'
import Button from '../common/Button'
import { createResumeShareLink, getResumeShareLinks, revokeResumeShareLink } from '../../services/resumeShareService'

function expiryLabel(value) { return value ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(value)) : 'Sans expiration' }

export default function ResumeSharing({ resume }) {
  const [links, setLinks] = useState([])
  const [expiresInDays, setExpiresInDays] = useState('30')
  const [includeContactDetails, setIncludeContactDetails] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  useEffect(() => { getResumeShareLinks(resume.id_resume).then((result) => setLinks(result.links || [])).catch((requestError) => setError(requestError.message)).finally(() => setLoading(false)) }, [resume.id_resume])
  async function create(event) { event.preventDefault(); setSaving(true); setError(''); setNotice(''); try { const result = await createResumeShareLink(resume.id_resume, { expiresInDays: expiresInDays ? Number(expiresInDays) : null, includeContactDetails }); setLinks((current) => [result.link, ...current]); setNotice('Lien de partage créé. Copiez-le et transmettez-le aux personnes choisies.') } catch (requestError) { setError(requestError.message) } finally { setSaving(false) } }
  async function revoke(link) { if (!window.confirm('Révoquer ce lien ? Les personnes qui le possèdent ne pourront plus consulter le CV.')) return; setSaving(true); setError(''); try { const result = await revokeResumeShareLink(resume.id_resume, link.id_resume_share_link); setLinks((current) => current.map((item) => item.id_resume_share_link === link.id_resume_share_link ? { ...item, revoked_at: result.link.revoked_at, path: '' } : item)) } catch (requestError) { setError(requestError.message) } finally { setSaving(false) } }
  async function copy(path) { try { await navigator.clipboard.writeText(window.location.origin + path); setNotice('Lien copié.') } catch { setNotice('Sélectionnez et copiez le lien affiché.') } }
  const activeCount = links.filter((item) => !item.revoked_at && (!item.expires_at || new Date(item.expires_at).getTime() > Date.now())).length
  return <section className="resume-sharing-card"><header><div><p>Partage privé</p><h2><Link2 size={17} /> Lien sécurisé vers ce CV</h2></div><ShieldCheck size={19} /></header><p>Seules les personnes qui possèdent le lien pourront l’ouvrir. Le lien peut être révoqué ou expirer. Les coordonnées restent masquées par défaut.</p>{error && <p className="editor-feedback editor-feedback--error" role="alert">{error}</p>}{notice && <p className="editor-feedback" role="status">{notice}</p>}
    {loading ? <p role="status">Chargement des liens…</p> : <><form onSubmit={create}><label>Expiration<select value={expiresInDays} onChange={(event) => setExpiresInDays(event.target.value)}><option value="7">7 jours</option><option value="30">30 jours</option><option value="90">90 jours</option><option value="">Aucune expiration</option></select></label><label className="share-contact-toggle"><input type="checkbox" checked={includeContactDetails} onChange={(event) => setIncludeContactDetails(event.target.checked)} /> Inclure e-mail, téléphone et ville</label>{includeContactDetails && <small>Ces coordonnées seront accessibles à toute personne disposant du lien.</small>}<Button type="submit" disabled={saving}>{saving ? 'Création…' : 'Créer un lien de partage'}</Button></form><ul>{links.map((link) => <li key={link.id_resume_share_link}><div><b>{link.revoked_at ? 'Lien révoqué' : (link.expires_at && new Date(link.expires_at).getTime() <= Date.now() ? 'Lien expiré' : 'Lien actif')}</b><small>{link.include_contact_details ? 'Coordonnées incluses' : 'Coordonnées masquées'} · {expiryLabel(link.expires_at)}</small>{link.path && <a href={link.path} target="_blank" rel="noreferrer" aria-label="Ouvrir le lien de partage">{window.location.origin + link.path}</a>}{!link.path && !link.revoked_at && <small>Le lien secret n’est affiché qu’à sa création. Révoquez-le puis créez-en un nouveau pour le repartager.</small>}</div>{link.path && <button type="button" aria-label="Copier le lien" onClick={() => copy(link.path)}><Copy size={15} /></button>}{!link.revoked_at && <button type="button" aria-label="Révoquer le lien" disabled={saving} onClick={() => revoke(link)}><Trash2 size={15} /></button>}</li>)}</ul><small>{activeCount} lien{activeCount > 1 ? 's' : ''} actif{activeCount > 1 ? 's' : ''}.</small></>}
  </section>
}
