import { Outlet } from 'react-router-dom'
import AppSidebar from './AppSidebar'

export default function AppLayout() {
  return <div className="workspace"><AppSidebar /><Outlet /></div>
}
