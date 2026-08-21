import { Outlet } from 'react-router-dom'
import { MobileNavigation } from './MobileNavigation'
import { Sidebar } from './Sidebar'

export function AppShell() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-content" id="main-content">
        <Outlet />
      </main>
      <MobileNavigation />
    </div>
  )
}
