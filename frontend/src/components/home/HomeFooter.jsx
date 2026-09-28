import { Link } from 'react-router-dom'
import { useAuth } from '../../store/AuthContext'
import Logo from '../common/Logo'

export default function HomeFooter() {
  const { isAuthenticated } = useAuth()
  return <footer className="home-footer" id="tarifs"><div className="page-width home-footer-inner"><div><Logo /><p>Des outils simples pour présenter votre parcours avec confiance.</p></div><nav aria-label="Liens du pied de page"><a href="#fonctionnalites">Fonctionnalités</a><a href="#modeles">Modèles</a>{!isAuthenticated && <Link to="/connexion">Connexion</Link>}</nav><small>© {new Date().getFullYear()} Novyata. Tous droits réservés.</small></div></footer>
}
