import { Link } from 'react-router-dom'
import Button from '../components/common/Button'

export default function NotFoundPage() { return <main className="not-found"><p>Erreur 404</p><h1>Cette page n’existe pas.</h1><Link to="/"><Button>Revenir à l’accueil</Button></Link></main> }
