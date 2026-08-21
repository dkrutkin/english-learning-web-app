import { Laptop, Moon, Sun } from 'lucide-react'
import { type Theme, useTheme } from '../../features/theme/ThemeProvider'

const options: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Laptop },
]

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme()
  if (compact) {
    const next: Theme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
    const current = options.find((item) => item.value === theme) ?? options[2]
    const Icon = current.icon
    return (
      <button
        aria-label={`Theme: ${current.label}. Change theme`}
        className="icon-button"
        type="button"
        onClick={() => setTheme(next)}
      >
        <Icon size={20} />
      </button>
    )
  }
  return (
    <div aria-label="Theme" className="segmented-control" role="group">
      {options.map(({ value, label, icon: Icon }) => (
        <button
          aria-pressed={theme === value}
          className={theme === value ? 'is-active' : undefined}
          key={value}
          type="button"
          onClick={() => setTheme(value)}
        >
          <Icon size={16} />
          {label}
        </button>
      ))}
    </div>
  )
}
