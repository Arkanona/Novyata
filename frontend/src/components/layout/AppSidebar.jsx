import { FileText, LayoutDashboard, LogOut, Settings } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import Logo from '../common/Logo'
import { useAuth } from '../../store/AuthContext'

const navigation = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Vue d’ensemble' },
  { to: '/cv', icon: FileText, label: 'Mes CV' },
]

export default function AppSidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const initials = ((user?.first_name?.[0] || '') + (user?.last_name?.[0] || '')).toUpperCase()

  function handleLogout() {
    logout()
    navigate('/connexion')
  }

  return <aside className="app-sidebar">
    <Logo />
    <nav className="sidebar-group" aria-label="Navigation principale">
      {navigation.map(({ to, icon: Icon, label }) => <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'active' : ''}><Icon size={18} />{label}</NavLink>)}
    </nav>
    <div className="sidebar-bottom">
      <button type="button"><Settings size={18} />Paramètres</button>
      <div className="profile"><span>{initials}</span><div><b>{user?.first_name} {user?.last_name}</b><small>{user?.email}</small></div></div>
      <button type="button" className="logout-button" onClick={handleLogout}><LogOut size={18} />Déconnexion</button>
    </div>
  </aside>
}
