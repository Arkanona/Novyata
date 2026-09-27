import { CirclePlus, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import Button from '../common/Button'

export default function ResumeEmptyState() {
  return <section className="empty-state">
    <span className="empty-icon"><FileText size={24} /></span>
    <h2>Votre premier CV commence ici.</h2>
    <p>Choisissez un modèle professionnel et complétez vos informations à votre rythme.</p>
    <Link to="/cv/nouveau"><Button><CirclePlus size={17} /> Créer un CV</Button></Link>
  </section>
}
