import { useCallback, useEffect, useState } from 'react'
import { Archive, Bell, Check, ExternalLink, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import Button from '../components/common/Button'
import { getApplications } from '../services/applicationService'
import { archiveAllNotifications, archiveNotification, createNextActionNotification, deleteNotification, getNotifications, markAllNotificationsRead, setNotificationRead } from '../services/notificationService'

const typeLabels = { interview_soon: 'Entretien', no_response: 'Suivi de candidature' }
const dateFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
const localDateTimeValue = (date) => { const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000); return local.toISOString().slice(0, 16) }

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([])
  const [applications, setApplications] = useState([])
  const [reminderApplication, setReminderApplication] = useState('')
  const [reminderTitle, setReminderTitle] = useState('Prochaine action')
  const [reminderBody, setReminderBody] = useState('')
  const [reminderDate, setReminderDate] = useState(() => localDateTimeValue(new Date(Date.now() + 86_400_000)))
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  const load = useCallback(async () => {
    try {
      const result = await getNotifications()
      setNotifications(result.notifications || [])
      setUnreadCount(result.unreadCount || 0)
      getApplications().then((applicationResult) => {
        const ownedApplications = applicationResult.applications || []
        setApplications(ownedApplications)
        setReminderApplication((current) => current || ownedApplications[0]?.id_application || '')
      }).catch(() => setApplications([]))
      setError('')
      window.dispatchEvent(new Event('novyata:notifications-updated'))
    } catch (requestError) { setError(requestError.message) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function runAction(key, action) {
    setBusy(key); setError('')
    try { await action(); await load() } catch (requestError) { setError(requestError.message) } finally { setBusy('') }
  }

  async function submitReminder(event) {
    event.preventDefault()
    setBusy('create'); setError('')
    try {
      await createNextActionNotification({ id_application: reminderApplication, title: reminderTitle, body: reminderBody, scheduled_for: new Date(reminderDate).toISOString() })
      setReminderBody('')
      await load()
    } catch (requestError) { setError(requestError.message) } finally { setBusy('') }
  }

  return <main className="app-page notifications-page">
    <header className="app-header">
      <div><p className="crumb">Votre recherche d’emploi</p><h1>Notifications</h1><p className="notifications-subtitle">Des rappels discrets pour vous aider à garder le fil de vos démarches.</p></div>
      {notifications.length > 0 && <div className="notifications-header-actions">
        {unreadCount > 0 && <Button variant="secondary" onClick={() => runAction('read-all', markAllNotificationsRead)} disabled={Boolean(busy)}>Tout marquer comme lu</Button>}
        <Button variant="secondary" onClick={() => runAction('archive-all', archiveAllNotifications)} disabled={Boolean(busy)}>Tout archiver</Button>
      </div>}
    </header>
    {error && <p className="editor-feedback editor-feedback--error" role="alert">{error}</p>}
    {loading ? <div className="notification-state" role="status">Chargement des notifications…</div>
      : <>
        <details className="notification-create"><summary>Programmer une prochaine action</summary><form onSubmit={submitReminder}>
          <label>Candidature<select required value={reminderApplication} onChange={(event) => setReminderApplication(event.target.value)}><option value="">Choisir une candidature</option>{applications.filter((item) => !['Archivée', 'Refusée'].includes(item.status)).map((item) => <option key={item.id_application} value={item.id_application}>{item.company_name} — {item.job_title}</option>)}</select></label>
          <label>Action à ne pas oublier<input required minLength="2" maxLength="160" value={reminderTitle} onChange={(event) => setReminderTitle(event.target.value)} /></label>
          <label>Date et heure<input required type="datetime-local" min={localDateTimeValue(new Date())} value={reminderDate} onChange={(event) => setReminderDate(event.target.value)} /></label>
          <label>Détail facultatif<textarea maxLength="500" rows="2" value={reminderBody} onChange={(event) => setReminderBody(event.target.value)} placeholder="Ex. relire mes notes avant de contacter le recruteur" /></label>
          {applications.length === 0 && <p className="notification-create-note">Ajoutez d’abord une candidature pour pouvoir y associer un rappel.</p>}
          <Button disabled={Boolean(busy) || !reminderApplication}>{busy === 'create' ? 'Programmation…' : 'Programmer le rappel'}</Button>
        </form></details>
        {notifications.length === 0 ? <section className="notification-empty"><span><Bell size={21} /></span><h2>Vous êtes à jour</h2><p>Les rappels d’entretien et de suivi apparaîtront ici lorsqu’une candidature nécessitera votre attention.</p></section>
        : <section className="notification-list" aria-label="Vos notifications">{notifications.map((item) => <article key={item.id_notification} className={'notification-card' + (item.is_read ? ' is-read' : '')}>
          <span className={'notification-icon notification-icon--' + item.type}><Bell size={17} /></span>
          <div className="notification-content"><div className="notification-meta"><span>{item.type === 'next_action' ? 'Prochaine action' : typeLabels[item.type] || 'Rappel'}</span>{!item.is_read && <i aria-label="Non lu" />}</div><h2>{item.title}</h2><p>{item.body}</p><time dateTime={item.scheduled_for}>{dateFormatter.format(new Date(item.scheduled_for))}</time></div>
          <div className="notification-actions">
            <Link to={`/candidatures/${item.id_application}`} aria-label="Ouvrir la candidature"><ExternalLink size={16} /></Link>
            <button type="button" disabled={busy === item.id_notification} aria-label={item.is_read ? 'Marquer comme non lu' : 'Marquer comme lu'} title={item.is_read ? 'Marquer comme non lu' : 'Marquer comme lu'} onClick={() => runAction(item.id_notification, () => setNotificationRead(item.id_notification, !item.is_read))}>{item.is_read ? <Bell size={16} /> : <Check size={16} />}</button>
            <button type="button" disabled={busy === item.id_notification} aria-label="Archiver la notification" title="Archiver" onClick={() => runAction(item.id_notification, () => archiveNotification(item.id_notification))}><Archive size={16} /></button>
            <button type="button" disabled={busy === item.id_notification} aria-label="Supprimer la notification" title="Supprimer" onClick={() => runAction(item.id_notification, () => deleteNotification(item.id_notification))}><Trash2 size={16} /></button>
          </div>
        </article>)}</section>}
      </>}
  </main>
}
