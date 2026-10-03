import Button from '../common/Button'

function InterviewFeedback({ feedback }) {
  if (!feedback) return null
  return <div className="interview-feedback">
    {feedback.positives?.length > 0 && <p><b>Point positif</b> · {feedback.positives.join(', ')}</p>}
    {feedback.missing && <p><b>À compléter</b> · {feedback.missing}</p>}
    {feedback.suggestion && <p><b>Conseil</b> · {feedback.suggestion}</p>}
    {feedback.starAdvice && <p className="interview-feedback__star"><b>Repère STAR</b><br />{feedback.starAdvice}</p>}
  </div>
}

const formatDate = (value) => value ? new Date(value).toLocaleDateString('fr-FR') : 'Date inconnue'

export default function InterviewSimulationPanel({ sessions, session, simulation, answer, onSessionChange, onAnswerChange, onStart, onSubmit, onComplete, loading, isPro }) {
  const exchanges = session?.exchanges || []
  const latest = exchanges.at(-1)
  const needsFeedbackRetry = Boolean(latest?.answer && !latest.feedback && session?.status === 'in_progress')
  const pending = latest?.answer && !needsFeedbackRetry ? null : latest
  const question = pending?.question || simulation?.question
  const completedExchanges = exchanges.filter((item) => item.answer && item.feedback)

  return <section className="interview-simulation" aria-labelledby="interview-simulation-title">
    <header className="interview-simulation__header">
      <div><p className="crumb">Entraînement guidé</p><h3 id="interview-simulation-title">Simulation d’entretien</h3>
        <p>Une question à la fois. Vos réponses et les retours restent enregistrés dans ce dossier.</p></div>
      {sessions.length > 0 && <label className="interview-simulation__select">Reprendre une session
        <select aria-label="Reprendre une simulation" value={session?.id_interview_session || ''} onChange={(event) => onSessionChange(event.target.value)}>
          <option value="">Nouvelle simulation</option>
          {sessions.map((item) => <option key={item.id_interview_session} value={item.id_interview_session}>
            {formatDate(item.updated_at)} · {item.exchanges?.filter((entry) => entry.answer).length || 0} réponse(s){item.status === 'completed' ? ' · Terminée' : ''}
          </option>)}
        </select>
      </label>}
    </header>

    {session && <div className="interview-simulation__progress" role="status">
        <span>{exchanges.filter((item) => item.answer).length} réponse(s) enregistrée(s)</span><span>{session.status === 'completed' ? 'Session terminée' : 'Session en cours'}</span>
    </div>}

    {completedExchanges.length > 0 && <ol className="simulation-history" aria-label="Historique des questions et réponses">
      {completedExchanges.map((entry, index) => <li key={`${entry.created_at || index}-${entry.question}`}>
        <span className="interview-simulation__step">Question {index + 1}</span><b>{entry.question}</b>
        <p><b>Votre réponse</b><br />{entry.answer}</p><InterviewFeedback feedback={entry.feedback} />
      </li>)}
    </ol>}

    {question && <article className="interview-simulation__current" aria-live="polite">
      <span>{session?.status === 'completed' ? 'Dernière question' : `Question ${completedExchanges.length + 1}`}</span><h4>{question}</h4>
      {!isPro && <p className="interview-simulation__free-note">Le retour détaillé avec repères STAR est disponible avec Pro.</p>}
      {session?.status !== 'completed' && <form onSubmit={onSubmit}>
        {needsFeedbackRetry && <p role="status">Votre réponse est enregistrée. Le retour n’a pas abouti ; vous pouvez relancer son analyse.</p>}
        <label htmlFor="interview-answer">{needsFeedbackRetry ? 'Réponse enregistrée' : 'Votre réponse'}</label><textarea id="interview-answer" required maxLength={4000} readOnly={needsFeedbackRetry} value={needsFeedbackRetry ? latest.answer : answer} onChange={(event) => onAnswerChange(event.target.value)} placeholder="Répondez avec vos propres exemples et expériences…" />
        <div className="interview-simulation__form-footer"><small>{(needsFeedbackRetry ? latest.answer : answer).length} / 4 000 caractères</small><Button disabled={loading || !(needsFeedbackRetry ? latest.answer : answer).trim()}>{loading ? 'Analyse en cours…' : needsFeedbackRetry ? 'Réessayer l’analyse' : 'Envoyer ma réponse'}</Button></div>
      </form>}
    </article>}

    {!question && <div className="interview-simulation__empty"><p>Entraînez-vous avec des questions adaptées au poste et à votre CV.</p><Button type="button" disabled={loading} onClick={onStart}>{loading ? 'Préparation…' : 'Démarrer la simulation'}</Button></div>}
    {session?.status === 'in_progress' && completedExchanges.length > 0 && <Button type="button" variant="secondary" disabled={loading} onClick={onComplete}>Terminer la simulation</Button>}
  </section>
}
