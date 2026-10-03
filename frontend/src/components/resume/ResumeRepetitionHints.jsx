import { useMemo, useState } from 'react'

const openings = ['développement de', 'création de', 'mise en place de', 'participation à', 'gestion de', 'conception de', 'réalisation de', 'responsable de']
const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr').trim()

export function findRepeatedOpenings(experiences = []) {
  const counts = new Map(openings.map((opening) => [opening, 0]))
  for (const experience of experiences) {
    const sentences = String(experience.description || '').split(/[.!?\n]+/).map(normalize).filter(Boolean)
    for (const sentence of sentences) for (const opening of openings) if (sentence.startsWith(normalize(opening))) counts.set(opening, counts.get(opening) + 1)
  }
  return [...counts].filter(([, count]) => count >= 2).map(([opening, count]) => ({ opening, count }))
}

export default function ResumeRepetitionHints({ experiences }) {
  const [dismissed, setDismissed] = useState(false)
  const repeated = useMemo(() => findRepeatedOpenings(experiences), [experiences])
  if (dismissed || repeated.length === 0) return null
  return <aside className="resume-repetition-hint" aria-label="Suggestion de rédaction"><div><b>Pour varier vos descriptions</b>{repeated.map(({ opening, count }) => <p key={opening}>« {opening} » revient au début de {count} phrases. Vous pouvez varier librement la formulation, par exemple avec « contribution à » ou « élaboration de ».</p>)}</div><button type="button" onClick={() => setDismissed(true)}>Ignorer</button></aside>
}
