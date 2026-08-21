import { ThemeToggle } from '../components/theme/ThemeToggle'
import { isSupabaseConfigured } from '../lib/supabase/client'

export function SettingsPage() {
  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Personalize how Fluent works for you.</p>
        </div>
      </header>
      <section className="settings-list">
        <article>
          <div>
            <h2>Appearance</h2>
            <p>Choose a light, dark or system theme.</p>
          </div>
          <ThemeToggle />
        </article>
        <article>
          <div>
            <h2>Supabase connection</h2>
            <p>
              {isSupabaseConfigured
                ? 'Environment variables are configured.'
                : 'Add values from .env.example to connect the backend.'}
            </p>
          </div>
          <span className={`status-dot${isSupabaseConfigured ? 'is-ready' : ''}`}>
            {isSupabaseConfigured ? 'Ready' : 'Setup required'}
          </span>
        </article>
      </section>
    </div>
  )
}
