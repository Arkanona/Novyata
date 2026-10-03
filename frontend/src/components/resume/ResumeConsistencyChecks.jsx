import { useMemo } from 'react'
import { skillCategories } from '../../data/skillSuggestions'

const skills = [...new Set(Object.values(skillCategories).flat())]
const fold = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr').trim()
const hasDateOrderIssue = (start, end) => /^\d{4}-\d{2}-\d{2}$/.test(start || '') && /^\d{4}-\d{2}-\d{2}$/.test(end || '') && end < start

export function findResumeConsistencyNotes({ summary = '', experiences = [], educations = [], skills: declaredSkills = [] } = {}) {
  const notes = []
  const checkItems = (items, type, label) => items.forEach((item, index) => {
    const name = item.job_title || item.degree || `${label} ${index + 1}`
    if (!String(item.description || '').trim()) notes.push({ id: `${type}-${index}-description`, message: `La description de « ${name} » est vide. Vérifiez si vous souhaitez la compléter.` })
    if (hasDateOrderIssue(item.start_date, item.end_date)) notes.push({ id: `${type}-${index}-dates`, message: `Les dates de « ${name} » semblent inversées. Vérifiez la chronologie.` })
  })
  checkItems(experiences, 'experience', 'Expérience')
  checkItems(educations, 'education', 'Formation')
  const summaryText = fold(summary)
  const declared = new Set(declaredSkills.map((item) => fold(item.name)))
  for (const skill of skills) {
    const folded = fold(skill)
    const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])${folded.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}\\p{N}])`, 'iu')
    if (!declared.has(folded) && pattern.test(summaryText)) notes.push({ id: `summary-skill-${folded}`, message: `Le résumé mentionne ${skill}, mais cette compétence n’apparaît pas dans la liste. Vérifiez si vous souhaitez harmoniser les deux sections.` })
  }
  return notes.slice(0, 6)
}

export default function ResumeConsistencyChecks(props) {
  const notes = useMemo(() => findResumeConsistencyNotes(props), [props.summary, props.experiences, props.educations, props.skills])
  if (!notes.length) return null
  return <aside className="resume-consistency-checks" aria-labelledby="resume-consistency-title"><div><p>Vérification indicative</p><h2 id="resume-consistency-title">Points à vérifier</h2><span>Ce sont des repères, pas des erreurs certaines. Rien n’est modifié automatiquement.</span></div><ul>{notes.map((note) => <li key={note.id}>{note.message}</li>)}</ul></aside>
}
