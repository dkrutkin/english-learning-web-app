import { Award, BookOpen, ChartNoAxesCombined, Home, Settings, UserRound } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { ThemeToggle } from '../theme/ThemeToggle'

const primaryItems = [
  { to: '/app/home', label: 'Home', icon: Home },
  { to: '/app/learn', label: 'Learn', icon: BookOpen },
  { to: '/app/progress', label: 'Progress', icon: ChartNoAxesCombined },
  { to: '/app/achievements', label: 'Achievements', icon: Award },
]
const secondaryItems = [
  { to: '/app/profile', label: 'Profile', icon: UserRound },
  { to: '/app/settings', label: 'Settings', icon: Settings },
]

function NavigationItem({ to, label, icon: Icon }: (typeof primaryItems)[number]) {
  return (
    <NavLink className={({ isActive }) => `nav-item${isActive ? 'is-active' : ''}`} to={to}>
      <Icon aria-hidden="true" size={20} />
      <span>{label}</span>
    </NavLink>
  )
}

export function Sidebar() {
  return (
    <aside className="sidebar">
      <NavLink aria-label="Fluent home" className="brand" to="/app/home">
        <span className="brand-mark">F</span>
        <span>Fluent</span>
      </NavLink>
      <nav aria-label="Primary navigation" className="nav-list">
        {primaryItems.map((item) => (
          <NavigationItem key={item.to} {...item} />
        ))}
      </nav>
      <div className="sidebar-footer">
        {secondaryItems.map((item) => (
          <NavigationItem key={item.to} {...item} />
        ))}
        <ThemeToggle compact />
      </div>
    </aside>
  )
}
