import { BookOpen, ChartNoAxesCombined, Home, UserRound } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const items = [
  { to: '/app/home', label: 'Home', icon: Home },
  { to: '/app/learn', label: 'Learn', icon: BookOpen },
  { to: '/app/progress', label: 'Progress', icon: ChartNoAxesCombined },
  { to: '/app/profile', label: 'Profile', icon: UserRound },
]

export function MobileNavigation() {
  return (
    <nav aria-label="Mobile navigation" className="mobile-navigation">
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink
          className={({ isActive }) => (isActive ? 'is-active' : undefined)}
          key={to}
          to={to}
        >
          <Icon aria-hidden="true" size={21} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
