import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../store/AuthContext'

export default function PrivateRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <main className="route-loading">Vérification de votre session…</main>
  if (!isAuthenticated) return <Navigate to="/connexion" replace state={{ from: location.pathname }} />
  return <Outlet />
}
