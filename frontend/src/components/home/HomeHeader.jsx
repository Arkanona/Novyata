import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../store/AuthContext'
import Logo from '../common/Logo'

export default function HomeHeader() {
  const [isOpen, setIsOpen] = useState(false)
  const { isAuthenticated } = useAuth()
  const closeMenu = () => setIsOpen(false)
  return <nav className="home-nav page-width" aria-label="Navigation principale">
    <Logo />
    <button type="button" className="home-menu-toggle" onClick={() => setIsOpen(!isOpen)} aria-expanded={isOpen} aria-label={isOpen ? 'Fermer le menu' : 'Ouvrir le menu'}>{isOpen ? <X size={20} /> : <Menu size={20} />}</button>
    <div className={'home-nav-content ' + (isOpen ? 'is-open' : '')}>
      <div className="home-nav-links"><Link to="/fonctionnalites" onClick={closeMenu}>Fonctionnalités</Link><Link to="/modeles" onClick={closeMenu}>Modèles</Link><Link to="/tarifs" onClick={closeMenu}>Tarifs</Link></div>
      <div className="home-nav-actions">{!isAuthenticated && <Link to="/connexion" onClick={closeMenu}>Se connecter</Link>}<Link className="button button--primary" to={isAuthenticated ? '/dashboard' : '/inscription'} onClick={closeMenu}>{isAuthenticated ? 'Mon espace' : 'Créer mon CV'}</Link></div>
    </div>
  </nav>
}
