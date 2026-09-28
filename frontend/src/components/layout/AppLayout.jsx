import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import AppSidebar from './AppSidebar'

export default function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const closeSidebar = () => setIsSidebarOpen(false)

  return <div className="workspace">
    <button type="button" className={'mobile-sidebar-toggle' + (isSidebarOpen ? ' is-open' : '')} onClick={() => setIsSidebarOpen((isOpen) => !isOpen)} aria-expanded={isSidebarOpen} aria-controls="app-sidebar" aria-label={isSidebarOpen ? 'Fermer le menu' : 'Ouvrir le menu'}>{isSidebarOpen ? <X size={20} /> : <Menu size={20} />}</button>
    {isSidebarOpen && <button type="button" className="sidebar-overlay" aria-label="Fermer le menu" onClick={closeSidebar} />}
    <AppSidebar isOpen={isSidebarOpen} onNavigate={closeSidebar} />
    <Outlet />
  </div>
}
