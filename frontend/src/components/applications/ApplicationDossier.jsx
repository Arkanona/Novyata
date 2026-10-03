import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../common/Button'
import { addApplicationNote, completeInterviewSimulation, createApplicationFollowup, createApplicationInterview, createInterviewPreparation, createInterviewSimulation, createThankYouMessage, getApplicationDossier, markApplicationFollowupSent, updateApplicationFollowup, updateApplicationInterview } from '../../services/applicationService'
import { useAuth } from '../../store/AuthContext'
import { hasPlanCapability } from '../../config/planCapabilities'
import InterviewSimulationPanel from './InterviewSimulationPanel'

const blankInterview = { interview_date: '', interview_type: '', people_met: '', feeling: '', questions_asked: '', key_points: '', next_steps: '', notes: '' }

export default function ApplicationDossier({ id }) {
  const { user } = useAuth(); const isPro = hasPlanCapability(user?.plan, 'advancedInterview'); const hasAdvancedFollowups = hasPlanCapability(user?.plan, 'advancedFollowups')
  const [dossier, setDossier] = useState(null); const [preparation, setPreparation] = useState(null); const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [interview, setInterview] = useState(blankInterview); const [editingInterview, setEditingInterview] = useState(null); const [answer, setAnswer] = useState(''); const [session, setSession] = useState(null); const [simulation, setSimulation] = useState(null); const [loading, setLoading] = useState(false)
  const [followupType, setFollowupType] = useState('Première relance')
  const load = () => getApplicationDossier(id).then(setDossier).catch((e) => setError(e.message))
  useEffect(() => { load() }, [id])
  async function action(fn, success) { setLoading(true); setError(''); try { const value = await fn(); if (value?.session) setSession(value.session); if (value?.simulation) setSimulation(value.simulation); if (value?.preparation) setPreparation(value.preparation); setNotice(success); await load(); return value } catch (e) { setError(e.message) } finally { setLoading(false) } }
  async function copyMessage(content) { try { await navigator.clipboard.writeText(content); setNotice('Message copié.'); } catch { setError('La copie est indisponible dans ce navigateur.') } }
  if (!dossier) return <section className="application-dossier"><p>Chargement du dossier…</p>{error && <p className="editor-feedback editor-feedback--error" role="alert">{error}</p>}</section>
  const { checklist = [], events = [], followups = [], interviews = [], interview_sessions: interviewSessions = [], followupSuggestion } = dossier
  async function runSimulation(response = '') { const result = await action(() => createInterviewSimulation(id, { sessionId: session?.id_interview_session, answer: response }), response ? 'Réponse enregistrée et analysée.' : 'Simulation démarrée.'); if (result) setAnswer('') }
  return <section className="application-dossier" aria-label="Dossier de candidature">
    <div className="dossier-documents"><h2>Préparation de la candidature</h2>{checklist.map((item) => <p key={item.id} className={item.done ? 'is-done' : ''}>{item.done ? '✓' : '○'} {item.label}</p>)}
      <Button type="button" variant="secondary" disabled={loading} onClick={() => action(() => createInterviewPreparation(id), 'Préparation d’entretien générée.')}>Préparer l’entretien</Button>
      {preparation && <section className="interview-preparation-result" aria-live="polite">
        <div className="interview-preparation-introduction"><h3>Votre introduction</h3><p>{preparation.introduction}</p></div>
        <div className="interview-preparation-question-groups">{[
          ['rh', 'Questions RH'], ['technique', 'Questions métier'], ['comportementale', 'Questions comportementales'],
        ].map(([category, label]) => <section key={category}><h4>{label}</h4><ol>{preparation.questions.filter((item) => item.category === category).map((item, index) => <li key={`${category}-${index}`}>{item.question}</li>)}</ol></section>)}</div>
        <section className="interview-preparation-lists"><div><h4>Points forts à valoriser</h4><ul>{preparation.strengths.map((item, index) => <li key={`strength-${index}`}>{item}</li>)}</ul></div><div><h4>À préparer</h4><ul>{preparation.prepare.map((item, index) => <li key={`prepare-${index}`}>{item}</li>)}</ul></div></section>
        <section className="interview-star-guide"><h4>Repère pour les exemples comportementaux · STAR</h4><ol><li><b>Situation</b> — le contexte réel</li><li><b>Tâche</b> — votre rôle</li><li><b>Action</b> — ce que vous avez fait</li><li><b>Résultat</b> — l’issue, sans l’inventer</li></ol></section>
        {preparation.recruiterQuestions.length > 0 && <section className="interview-preparation-recruiter"><h4>Questions à poser au recruteur</h4><ul>{preparation.recruiterQuestions.map((item, index) => <li key={`recruiter-${index}`}>{item}</li>)}</ul></section>}
      </section>}
      {followupSuggestion?.suggested && <p className="dossier-suggestion">Une relance peut être préparée pour cette candidature.</p>}
    </div>
    <div className="dossier-timeline"><h2>Suivi et entretiens</h2>{error && <p className="editor-feedback editor-feedback--error" role="alert">{error}</p>}{notice && <p className="editor-feedback" role="status">{notice}</p>}
      <ol>{events.map((event) => <li key={event.id_application_event}><time>{new Date(event.event_date).toLocaleDateString('fr-FR')}</time><div><b>{event.title}</b>{event.description && <p>{event.description}</p>}</div></li>)}</ol>
      <form onSubmit={(e) => { e.preventDefault(); action(() => addApplicationNote(id, { title: 'Note utilisateur', description: e.currentTarget.note.value }), 'Note ajoutée.'); e.currentTarget.reset() }}><label>Ajouter une note<textarea name="note" required /></label><Button>Ajouter à la timeline</Button></form>
      <form onSubmit={(e) => { e.preventDefault(); action(() => editingInterview ? updateApplicationInterview(id, editingInterview, interview) : createApplicationInterview(id, interview), editingInterview ? 'Compte-rendu modifié.' : 'Compte-rendu ajouté.'); setInterview(blankInterview); setEditingInterview(null) }}><h3>Compte-rendu d’entretien</h3><label>Date<input type="datetime-local" value={interview.interview_date} onChange={(e) => setInterview({ ...interview, interview_date: e.target.value })} /></label><label>Type d’entretien<input value={interview.interview_type} onChange={(e) => setInterview({ ...interview, interview_type: e.target.value })} placeholder="Visio, téléphone…" /></label><label>Personnes rencontrées<textarea value={interview.people_met} onChange={(e) => setInterview({ ...interview, people_met: e.target.value })} /></label><label>Ressenti<input value={interview.feeling} onChange={(e) => setInterview({ ...interview, feeling: e.target.value })} placeholder="Très positif, à nuancer…" /></label><label>Questions posées<textarea value={interview.questions_asked} onChange={(e) => setInterview({ ...interview, questions_asked: e.target.value })} /></label><label>Points importants<textarea value={interview.key_points} onChange={(e) => setInterview({ ...interview, key_points: e.target.value })} /></label><label>Prochaines étapes<textarea value={interview.next_steps} onChange={(e) => setInterview({ ...interview, next_steps: e.target.value })} /></label><label>Notes libres<textarea value={interview.notes} onChange={(e) => setInterview({ ...interview, notes: e.target.value })} /></label><Button disabled={loading}>{editingInterview ? 'Modifier le compte-rendu' : 'Enregistrer le compte-rendu'}</Button></form>{interviews.map((item) => <article className="dossier-followup" key={item.id_interview}><b>{item.interview_type || 'Entretien'}{item.interview_date ? ` · ${new Date(item.interview_date).toLocaleDateString('fr-FR')}` : ''}</b>{item.people_met && <p>Personnes rencontrées : {item.people_met}</p>}{item.feeling && <p>Ressenti : {item.feeling}</p>}{item.key_points && <p>{item.key_points}</p>}<Button type="button" variant="secondary" onClick={() => { setEditingInterview(item.id_interview); setInterview({ ...blankInterview, ...item, interview_date: item.interview_date ? new Date(item.interview_date).toISOString().slice(0, 16) : '' }) }}>Modifier le compte-rendu</Button></article>)}
      {interviews.length > 0 && (hasAdvancedFollowups ? <Button type="button" variant="secondary" disabled={loading} onClick={() => action(() => createThankYouMessage(id), 'Brouillon de remerciement créé.')}>Générer un remerciement</Button> : <p className="dossier-pro-locked">Le message de remerciement après entretien est disponible avec Pro. <Link to="/tarifs">Découvrir Pro</Link></p>)}
      <InterviewSimulationPanel
        sessions={interviewSessions}
        session={session}
        simulation={simulation}
        answer={answer}
        loading={loading}
        isPro={isPro}
        onAnswerChange={setAnswer}
        onStart={() => runSimulation('')}
        onSubmit={(event) => { event.preventDefault(); runSimulation(answer) }}
        onComplete={() => action(() => completeInterviewSimulation(id, session.id_interview_session), 'Simulation terminée.')}
        onSessionChange={(sessionId) => {
          const selected = interviewSessions.find((item) => item.id_interview_session === sessionId) || null
          setSession(selected)
          const pending = selected?.exchanges?.at(-1)
          setAnswer(pending?.answer && !pending.feedback ? pending.answer : '')
          setSimulation(pending ? { question: pending.question } : null)
        }}
      />
      <h3>Relances et remerciements</h3>{followups.map((item) => <div className="dossier-followup" key={item.id_followup}><b>{item.type}{item.sent_at ? ' · Envoyé' : ''}</b><textarea value={item.content} onChange={(e) => setDossier((current) => ({ ...current, followups: current.followups.map((f) => f.id_followup === item.id_followup ? { ...f, ...item, content: e.target.value } : f) }))} /><div><Button type="button" variant="secondary" onClick={() => action(() => updateApplicationFollowup(id, item.id_followup, { content: item.content }), 'Brouillon enregistré.')}>Enregistrer</Button><Button type="button" variant="secondary" onClick={() => copyMessage(item.content)}>Copier</Button>{!item.sent_at && <Button type="button" onClick={() => action(() => markApplicationFollowupSent(id, item.id_followup), 'Message marqué comme envoyé.')}>Marquer envoyé</Button>}</div></div>)}<div className="dossier-followup-controls">{hasAdvancedFollowups && <label>Type de relance<select aria-label="Type de relance" value={followupType} onChange={(event) => setFollowupType(event.target.value)}><option>Première relance</option><option>Deuxième relance</option><option>Après entretien</option></select></label>}<Button type="button" variant="secondary" disabled={loading} onClick={() => action(() => createApplicationFollowup(id, { type: followupType }), 'Brouillon de relance créé.')}>Préparer une relance</Button></div>{!hasAdvancedFollowups && <p className="dossier-pro-locked">Deuxième relance, relance après entretien et remerciements : <Link to="/tarifs">disponibles avec Pro</Link>.</p>}
    </div>
  </section>
}
