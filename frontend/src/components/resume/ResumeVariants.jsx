import { useState } from 'react'
import { CopyPlus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../common/Button'
import { createResumeVariant } from '../../services/resumeService'

export default function ResumeVariants({ resume, plan = 'free' }) {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')
  const isPro = plan === 'pro'

  async function createVariant(event) {
    event.preventDefault()
    setIsCreating(true); setError('')
    try {
      const result = await createResumeVariant(resume.id_resume, title)
      navigate(`/cv/${result.resume.id_resume}`)
    } catch (requestError) { setError(requestError.message) } finally { setIsCreating(false) }
  }

  return <section className="resume-variants-card" aria-labelledby="resume-variants-title">
    <div className="resume-variants-heading"><div><p>Organisation</p><h2 id="resume-variants-title">Variantes de ce CV</h2></div><CopyPlus size={19} aria-hidden="true" /></div>
    {resume.parent_resume_id && <p className="resume-variant-parent">Cette version est une copie indépendante d’un autre CV.</p>}
    {resume.variants?.length > 0 && <ul>{resume.variants.map((variant) => <li key={variant.id_resume}><Link to={`/cv/${variant.id_resume}`}><b>{variant.title_resume}</b><span>{variant.job_title}</span></Link></li>)}</ul>}
    {isPro ? <form className="resume-variant-form" onSubmit={createVariant}><label htmlFor="resume-variant-title">Nom de la nouvelle variante</label><div><input id="resume-variant-title" maxLength={160} minLength={2} required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex. Version Product Designer" /><Button type="submit" disabled={isCreating}>{isCreating ? 'Création…' : 'Créer une variante'}</Button></div>{error && <p className="editor-feedback editor-feedback--error" role="alert">{error}</p>}</form> : <div className="pro-feature-locked"><p>Dupliquez votre CV pour créer une version adaptée à chaque candidature, sans toucher à l’original.</p><Link className="pro-customization-cta" to="/tarifs">Découvrir Pro</Link></div>}
  </section>
}
