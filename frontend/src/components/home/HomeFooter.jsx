import { Link } from 'react-router-dom'
import { useAuth } from '../../store/AuthContext'
import Logo from '../common/Logo'

export default function HomeFooter() {
  const { isAuthenticated } = useAuth()
  return <footer className="home-footer"><div className="page-width home-footer-inner"><div><Logo /><p>Des outils simples pour présenter votre parcours avec confiance.</p></div><nav aria-label="Liens du pied de page"><Link to="/fonctionnalites">Fonctionnalités</Link><Link to="/modeles">Modèles</Link><Link to="/tarifs">Tarifs</Link>{!isAuthenticated && <Link to="/connexion">Se connecter</Link>}<Link to="/mentions-legales">Mentions légales</Link><Link to="/confidentialite">Confidentialité</Link><Link to="/conditions">Conditions</Link></nav><small>© {new Date().getFullYear()} Novyata. Tous droits réservés.</small></div></footer>
}
