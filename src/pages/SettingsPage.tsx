import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ThemeToggle } from '../components/theme/ThemeToggle'
import { useAuth } from '../features/auth/AuthProvider'
import { authErrorMessage } from '../features/auth/validation'
import { isSupabaseConfigured } from '../lib/supabase/client'

export function SettingsPage() {
  const { signOut, user } = useAuth()
  const navigate = useNavigate()
  const [showLogout, setShowLogout] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogout() {
    setError(null)
    setIsSigningOut(true)
    try {
      await signOut()
      navigate('/login', { replace: true, state: { notice: 'You have been signed out.' } })
    } catch (logoutError) {
      setError(authErrorMessage(logoutError))
      setIsSigningOut(false)
      setShowLogout(false)
    }
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Personalize how Fluent works for you.</p>
        </div>
      </header>
      {error && (
        <p className="form-message form-message--error" role="alert">
          {error}
        </p>
      )}
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
        <article>
          <div>
            <h2>Account</h2>
            <p>{user?.email}</p>
          </div>
          <button className="button button--secondary" onClick={() => setShowLogout(true)}>
            Sign out
          </button>
        </article>
      </section>
      {showLogout && (
        <div
          aria-labelledby="logout-title"
          aria-modal="true"
          className="modal-backdrop"
          role="dialog"
        >
          <section className="modal-card">
            <h2 id="logout-title">Sign out?</h2>
            <p>Your progress is saved. You can sign in again on this or another device.</p>
            <div className="modal-actions">
              <button
                className="button button--secondary"
                disabled={isSigningOut}
                onClick={() => setShowLogout(false)}
              >
                Cancel
              </button>
              <button
                className="button button--primary"
                disabled={isSigningOut}
                onClick={handleLogout}
              >
                {isSigningOut ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
