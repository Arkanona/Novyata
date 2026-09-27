import { Link } from 'react-router-dom'

export default function Logo() {
  return <Link className="brand" to="/" aria-label="Novyata, accueil"><span className="brand-mark">n</span><span>novyata</span></Link>
}
