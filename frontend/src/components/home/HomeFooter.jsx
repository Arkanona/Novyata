import { Link } from 'react-router-dom'
import Logo from '../common/Logo'

export default function HomeFooter() {
  return <footer className="home-footer" id="tarifs"><div className="page-width home-footer-inner"><div><Logo /><p>Des outils simples pour présenter votre parcours avec confiance.</p></div><nav aria-label="Liens du pied de page"><a href="#fonctionnalites">Fonctionnalités</a><a href="#modeles">Modèles</a><Link to="/connexion">Connexion</Link></nav><small>© {new Date().getFullYear()} Novyata. Tous droits réservés.</small></div></footer>
}
