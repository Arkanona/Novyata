import { useEffect, useState } from 'react'
import { getAdvancedApplicationStatistics } from '../../services/applicationService'

const periods = [30, 90, 180]
const formatRate = (value) => value === null || value === undefined ? '—' : `${value} %`

export default function AdvancedStatisticsPanel() {
  const [period, setPeriod] = useState(90)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    getAdvancedApplicationStatistics(period)
      .then((result) => { if (active) setReport(result) })
      .catch((requestError) => { if (active) setError(requestError.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [period])

  const maxWeeklyCount = Math.max(1, ...(report?.weeklyTrend || []).flatMap((week) => [week.applications, week.responses]))

  return <section className="advanced-statistics" aria-labelledby="advanced-statistics-title">
    <header className="advanced-statistics__header">
      <div><p className="crumb">Novyata Pro</p><h2 id="advanced-statistics-title">Statistiques avancées</h2><p>Descriptif de vos candidatures, sans comparaison de performance entre CV.</p></div>
      <label>Afficher la période
        <select aria-label="Période des statistiques" value={period} onChange={(event) => setPeriod(Number(event.target.value))}>
          {periods.map((days) => <option key={days} value={days}>Derniers {days} jours</option>)}
        </select>
      </label>
    </header>
    {loading ? <p className="dashboard-feedback" role="status">Calcul des statistiques…</p>
      : error ? <p className="dashboard-feedback dashboard-feedback--error" role="alert">{error}</p>
        : report && <>
          <div className="advanced-statistics__metrics">
            <article><span>Taux de réponse</span><strong>{formatRate(report.responseRate)}</strong><small>{report.funnel.responses} réponses observées</small></article>
            <article><span>Taux d’entretien</span><strong>{formatRate(report.interviewRate)}</strong><small>{report.funnel.interviews} entretiens ou propositions</small></article>
            <article><span>Délai moyen de réponse</span><strong>{report.averageResponseDelayDays === null ? '—' : `${report.averageResponseDelayDays} j`}</strong><small>{report.responseDelaySampleSize} réponse{report.responseDelaySampleSize > 1 ? 's' : ''} datée{report.responseDelaySampleSize > 1 ? 's' : ''}</small></article>
          </div>
          <div className="advanced-statistics__funnel" aria-label="Étapes des candidatures sur la période">
            {[
              ['Candidatures', report.funnel.applications], ['Réponses', report.funnel.responses], ['Entretiens', report.funnel.interviews],
              ['Propositions', report.funnel.offers], ['Refus', report.funnel.refusals],
            ].map(([label, value]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}
          </div>
          <section className="advanced-statistics__trend" aria-label="Évolution hebdomadaire">
            <h3>Évolution par semaine</h3>
            <div className="advanced-statistics__legend"><span><i /> Envoyées</span><span><i /> Réponses</span></div>
            <ol>{report.weeklyTrend.map((week) => <li key={week.week} aria-label={`${week.label} : ${week.applications} candidatures, ${week.responses} réponses`}>
              <div className="advanced-statistics__bars"><span title={`${week.applications} candidatures`} style={{ height: `${(week.applications / maxWeeklyCount) * 100}%` }} /><span title={`${week.responses} réponses`} style={{ height: `${(week.responses / maxWeeklyCount) * 100}%` }} /></div>
              <small>{week.label}</small>
            </li>)}</ol>
          </section>
          <section className="advanced-statistics__resume-results">
            <h3>Résultats observés par CV</h3>
            {report.outcomesByResume.length === 0 ? <p>Aucune candidature sur cette période.</p> : <div className="advanced-statistics__table-wrap"><table><thead><tr><th scope="col">CV utilisé</th><th scope="col">Candidatures</th><th scope="col">Réponses</th><th scope="col">Entretiens</th><th scope="col">Propositions</th></tr></thead><tbody>{report.outcomesByResume.map((result) => <tr key={result.resumeId || 'unlinked'}><th scope="row">{result.resumeTitle}</th><td>{result.applications}</td><td>{result.responses}</td><td>{result.interviews}</td><td>{result.offers}</td></tr>)}</tbody></table></div>}
          </section>
          <p className="advanced-statistics__note">{report.historyNote} Les données affichées décrivent les résultats observés avec chaque CV.</p>
        </>}
  </section>
}
