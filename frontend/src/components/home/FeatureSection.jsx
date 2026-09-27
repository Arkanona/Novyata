import { BriefcaseBusiness, FileText, Mail } from 'lucide-react'

const features = [
  { icon: FileText, title: 'CV', text: 'Un éditeur clair pour composer un CV professionnel, à votre rythme.', status: 'Disponible' },
  { icon: Mail, title: 'Lettre de motivation', text: 'Gardez vos lettres à portée de main et adaptez-les à chaque opportunité.', status: 'Bientôt disponible' },
  { icon: BriefcaseBusiness, title: 'Suivi des candidatures', text: 'Visualisez vos démarches et les prochaines étapes de votre recherche.', status: 'Bientôt disponible' },
]

export default function FeatureSection() {
  return <section className="home-features page-width" id="fonctionnalites"><div className="home-section-intro"><p className="home-eyebrow"><span /> Une recherche plus sereine</p><h2>Les bons outils, au bon endroit.</h2><p>Novyata rassemble progressivement tout ce dont vous avez besoin pour avancer avec confiance.</p></div><div className="home-feature-grid">{features.map(({ icon: Icon, title, text, status }) => <article className="home-feature-card" key={title}><div className="feature-card-top"><span><Icon size={20} /></span><small className={status === 'Disponible' ? 'is-available' : ''}>{status}</small></div><h3>{title}</h3><p>{text}</p></article>)}</div></section>
}
