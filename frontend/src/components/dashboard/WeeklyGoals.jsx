import { useEffect, useState } from 'react'
import { Target } from 'lucide-react'
import Button from '../common/Button'
import { getWeeklyGoal, saveWeeklyGoal } from '../../services/weeklyGoalService'

const defaults = { is_enabled: false, target_applications: 5, target_followups: 2, target_interviews: 1 }
const fields = [['target_applications', 'Candidatures cette semaine', 'applications'], ['target_followups', 'Relances envoyées', 'followups'], ['target_interviews', 'Simulations d’entretien', 'interviews']]

export default function WeeklyGoals() {
  const [goal, setGoal] = useState(defaults)
  const [progress, setProgress] = useState({ applications: 0, followups: 0, interviews: 0 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  useEffect(() => { getWeeklyGoal().then((result) => { setGoal(result.goal); setProgress(result.progress) }).catch((requestError) => setError(requestError.message)).finally(() => setLoading(false)) }, [])
  async function save(event) { event.preventDefault(); setSaving(true); setError(''); setNotice(''); try { const result = await saveWeeklyGoal(goal); setGoal(result.goal); setProgress(result.progress); setNotice('Objectifs enregistrés.') } catch (requestError) { setError(requestError.message) } finally { setSaving(false) } }
  const update = (key, value) => setGoal((current) => ({ ...current, [key]: value }))
  return <section className="weekly-goals-card" aria-labelledby="weekly-goals-title"><header><span><Target size={19} /><span><p>Facultatif</p><h2 id="weekly-goals-title">Objectifs de la semaine</h2></span></span><small>À votre rythme, sans classement.</small></header>{error && <p role="alert" className="editor-feedback editor-feedback--error">{error}</p>}{notice && <p role="status" className="editor-feedback">{notice}</p>}{loading ? <p role="status">Chargement…</p> : <form onSubmit={save}><label className="weekly-goals-toggle"><input type="checkbox" checked={goal.is_enabled} onChange={(event) => update('is_enabled', event.target.checked)} /> Activer mes objectifs hebdomadaires</label>{goal.is_enabled && <div className="weekly-goal-grid">{fields.map(([key, label, progressKey]) => <label key={key}>{label}<span className="weekly-goal-progress">{progress[progressKey] || 0} / {goal[key]}</span><input aria-label={label} type="number" min="1" max="50" value={goal[key]} onChange={(event) => update(key, Math.min(50, Math.max(1, Number(event.target.value) || 1)))} /><i><span style={{ width: `${Math.min(100, (progress[progressKey] || 0) / goal[key] * 100)}%` }} /></i></label>)}</div>}<Button type="submit" variant="secondary" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer mes objectifs'}</Button></form>}</section>
}
