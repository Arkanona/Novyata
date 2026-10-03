import { Bell, BriefcaseBusiness, FileText, Globe2, History, House, LayoutDashboard, LogOut, Mail, MessageSquareText, ScanSearch, Settings } from 'lucide-react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useState } from 'react'
import Logo from '../common/Logo'
import { useAuth } from '../../store/AuthContext'
import { getNotifications } from '../../services/notificationService'

const navigation = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Vue d’ensemble' },
  { to: '/cv', icon: FileText, label: 'Mes CV' },
  { to: '/lettres', icon: Mail, label: 'Lettres de motivation' },
  { to: '/candidatures', icon: BriefcaseBusiness, label: 'Candidatures' },
  { to: '/analyse-offre', icon: ScanSearch, label: 'Analyse d’offre' },
  { to: '/analyses', icon: History, label: 'Mes analyses' },
  { to: '/reponses', icon: MessageSquareText, label: 'Mes réponses' },
  { to: '/portfolio', icon: Globe2, label: 'Portfolio public' },
]

export default function AppSidebar({ isOpen = false, onNavigate = () => {} }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [unreadCount, setUnreadCount] = useState(0)
  const initials = ((user?.first_name?.[0] || '') + (user?.last_name?.[0] || '')).toUpperCase()

  const refreshUnread = useCallback(() => {
    getNotifications().then((result) => setUnreadCount(result.unreadCount || 0)).catch(() => {})
  }, [])

  useEffect(() => {
    refreshUnread()
    const timer = window.setInterval(refreshUnread, 5 * 60 * 1000)
    window.addEventListener('novyata:notifications-updated', refreshUnread)
    return () => { window.clearInterval(timer); window.removeEventListener('novyata:notifications-updated', refreshUnread) }
  }, [refreshUnread])

  function handleLogout() {
    onNavigate()
    logout()
    navigate('/connexion')
  }

  return <aside className={'app-sidebar' + (isOpen ? ' is-open' : '')} id="app-sidebar">
    <Logo />
    <nav className="sidebar-group" aria-label="Navigation principale">
      {navigation.map(({ to, icon: Icon, label }) => <NavLink key={to} to={to} onClick={onNavigate} className={({ isActive }) => isActive ? 'active' : ''}><Icon size={18} />{label}</NavLink>)}
      <NavLink to="/notifications" onClick={onNavigate} aria-label={unreadCount ? `Notifications, ${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Notifications'} className={({ isActive }) => isActive ? 'active sidebar-notifications-link' : 'sidebar-notifications-link'}><Bell size={18} />Notifications{unreadCount > 0 && <span className="notification-count-badge" aria-hidden="true">{unreadCount > 99 ? '99+' : unreadCount}</span>}</NavLink>
      <Link to={user?.plan === 'pro' ? '/historique' : '/tarifs'} onClick={onNavigate} className="sidebar-pro-history"><History size={18} />Historique complet<span>Pro</span></Link>
      <Link to="/" onClick={onNavigate}><House size={18} />Accueil</Link>
    </nav>
    <div className="sidebar-bottom">
      <NavLink to="/parametres" onClick={onNavigate} className={({ isActive }) => isActive ? 'active' : ''}><Settings size={18} />Paramètres</NavLink>
      <div className="profile"><span>{initials}</span><div><b>{user?.first_name} {user?.last_name}</b><small>{user?.email}</small></div></div>
      <button type="button" className="logout-button" onClick={handleLogout}><LogOut size={18} />Déconnexion</button>
    </div>
  </aside>
}
