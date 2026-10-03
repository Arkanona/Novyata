import { useMemo, useState } from 'react'
import { skillCategories } from '../../data/skillSuggestions'
import { createSkill } from '../../services/resumeService'
import Button from '../common/Button'

const candidates = [...new Set(Object.values(skillCategories).flat())]
const normalized = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr').trim()
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function findExperienceSkillSuggestions(experiences = [], skills = []) {
  const source = experiences.map((item) => [item.job_title, item.description].filter(Boolean).join(' ')).join('\n').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const present = new Set(skills.map((item) => normalized(item.name)))
  return candidates.map((name) => {
    const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegex(name.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))}($|[^\\p{L}\\p{N}])`, 'giu')
    const count = [...source.matchAll(pattern)].length
    return { name, count }
  }).filter((item) => item.count >= 2 && !present.has(normalized(item.name))).slice(0, 4)
}

export default function ResumeSkillSuggestions({ resumeId, experiences, skills, setSkills }) {
  const [ignored, setIgnored] = useState([])
  const [saving, setSaving] = useState('')
  const [error, setError] = useState('')
  const suggestions = useMemo(() => findExperienceSkillSuggestions(experiences, skills).filter((item) => !ignored.includes(item.name)), [experiences, skills, ignored])
  async function add(item) {
    setSaving(item.name); setError('')
    try {
      const result = await createSkill(resumeId, { name: item.name, level: '' })
      setSkills((current) => [...current, result.skill])
    } catch (requestError) { setError(requestError.message) } finally { setSaving('') }
  }
  if (!suggestions.length) return null
  return <aside className="resume-skill-suggestions" aria-labelledby="resume-suggestions-title"><div><p>Suggestions à vérifier</p><h2 id="resume-suggestions-title">Des compétences citées dans vos expériences</h2><span>À ajouter uniquement si elles correspondent bien à vos compétences.</span></div>{error && <p className="editor-feedback editor-feedback--error" role="alert">{error}</p>}<ul>{suggestions.map((item) => <li key={item.name}><p><b>{item.name}</b> apparaît {item.count} fois dans vos expériences. L’ajouter à vos compétences ?</p><div><Button type="button" variant="secondary" disabled={Boolean(saving)} onClick={() => add(item)}>{saving === item.name ? 'Ajout…' : 'Ajouter'}</Button><Button type="button" variant="secondary" disabled={Boolean(saving)} onClick={() => setIgnored((current) => [...current, item.name])}>Ignorer</Button></div></li>)}</ul></aside>
}
