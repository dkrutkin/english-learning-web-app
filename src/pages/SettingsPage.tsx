import { Check, KeyRound, Languages, LogOut, Target } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ThemeToggle } from '../components/theme/ThemeToggle'
import { useAuth } from '../features/auth/AuthProvider'
import { authErrorMessage, passwordConfirmationSchema } from '../features/auth/validation'
import { useAccountProfile, useUpdateAccountProfile } from '../features/profile/hooks'
import type { ProfileTheme, WeeklyGoal } from '../features/profile/types'

const weeklyGoals: Array<{ value: WeeklyGoal; label: string }> = [
  { value: 3, label: '3 days' },
  { value: 4, label: '4 days' },
  { value: 5, label: '5 days' },
  { value: 7, label: 'Every day' },
]

export function SettingsPage() {
  const { changePassword, signOut, user } = useAuth()
  const profile = useAccountProfile()
  const updateProfile = useUpdateAccountProfile()
  const navigate = useNavigate()
  const [showLogout, setShowLogout] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!message) return
    const timeout = window.setTimeout(() => setMessage(null), 2500)
    return () => window.clearTimeout(timeout)
  }, [message])

  async function savePreference(updates: Parameters<typeof updateProfile.mutateAsync>[0]) {
    setError(null)
    setMessage(null)
    try {
      await updateProfile.mutateAsync(updates)
      setMessage('Settings saved')
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Could not save settings.')
    }
  }

  async function handlePasswordSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    const validated = passwordConfirmationSchema.safeParse({ password, confirmPassword })
    if (!validated.success) {
      setError(validated.error.issues[0]?.message ?? 'Check the new password.')
      return
    }
    if (!currentPassword) {
      setError('Enter your current password.')
      return
    }
    try {
      await changePassword(currentPassword, validated.data.password)
      setCurrentPassword('')
      setPassword('')
      setConfirmPassword('')
      setShowPassword(false)
      setMessage('Password changed')
    } catch (passwordError) {
      setError(
        passwordError instanceof Error ? passwordError.message : authErrorMessage(passwordError),
      )
    }
  }

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

  const preferences = profile.data

  return (
    <div className="page-container settings-page">
      <header className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Personalize your learning experience</p>
        </div>
        {updateProfile.isPending && <span className="settings-save-status">Saving…</span>}
      </header>
      {error && (
        <p className="form-message form-message--error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="form-message form-message--success" role="status">
          <Check aria-hidden="true" size={16} /> {message}
        </p>
      )}

      <div className="settings-sections">
        <section className="panel settings-section">
          <div className="settings-section-heading">
            <p className="eyebrow">Appearance</p>
            <h2>Choose your theme</h2>
            <p>Use Fluent in light mode, dark mode or follow your device</p>
          </div>
          <ThemeToggle onChange={(theme: ProfileTheme) => void savePreference({ theme })} />
        </section>

        <section className="panel settings-section">
          <div className="settings-section-heading">
            <p className="eyebrow">Learning</p>
            <h2>Learning preferences</h2>
          </div>
          <div className="settings-option-row">
            <div className="settings-option-copy">
              <span className="settings-option-icon">
                <Languages aria-hidden="true" size={19} />
              </span>
              <div>
                <strong>Show translations</strong>
                <p>Display translation hints in vocabulary activities</p>
              </div>
            </div>
            <button
              aria-checked={preferences?.showTranslations ?? false}
              aria-label="Show translations"
              className={`switch${preferences?.showTranslations ? 'is-on' : ''}`}
              disabled={!preferences || updateProfile.isPending}
              role="switch"
              onClick={() =>
                void savePreference({ showTranslations: !preferences?.showTranslations })
              }
            >
              <span />
            </button>
          </div>
          <div className="settings-option-row settings-option-row--stacked">
            <div className="settings-option-copy">
              <span className="settings-option-icon">
                <Target aria-hidden="true" size={19} />
              </span>
              <div>
                <strong>Weekly goal</strong>
                <p>Choose how many days you want to study each week</p>
              </div>
            </div>
            <div
              aria-label="Weekly goal"
              className="segmented-control settings-goal-control"
              role="group"
            >
              {weeklyGoals.map((goal) => (
                <button
                  aria-pressed={preferences?.weeklyGoal === goal.value}
                  className={preferences?.weeklyGoal === goal.value ? 'is-active' : undefined}
                  disabled={!preferences || updateProfile.isPending}
                  key={goal.value}
                  onClick={() => void savePreference({ weeklyGoal: goal.value })}
                >
                  {goal.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="panel settings-section">
          <div className="settings-section-heading">
            <p className="eyebrow">Account</p>
            <h2>Security and access</h2>
          </div>
          <div className="settings-option-row">
            <div className="settings-option-copy">
              <span className="settings-option-icon">
                <KeyRound aria-hidden="true" size={19} />
              </span>
              <div>
                <strong>Password</strong>
                <p>Use at least 8 characters for your password</p>
              </div>
            </div>
            <button
              className="button button--secondary"
              onClick={() => setShowPassword((value) => !value)}
            >
              {showPassword ? 'Cancel' : 'Change password'}
            </button>
          </div>
          {showPassword && (
            <form className="settings-password-form" onSubmit={handlePasswordSubmit}>
              <label>
                <span>Current password</span>
                <input
                  autoComplete="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                />
              </label>
              <label>
                <span>New password</span>
                <input
                  autoComplete="new-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
              <label>
                <span>Confirm new password</span>
                <input
                  autoComplete="new-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </label>
              <button className="button button--primary" type="submit">
                Update password
              </button>
            </form>
          )}
          <div className="settings-option-row">
            <div className="settings-option-copy">
              <span className="settings-option-icon">
                <LogOut aria-hidden="true" size={19} />
              </span>
              <div>
                <strong>Signed in as</strong>
                <p>{user?.email}</p>
              </div>
            </div>
            <button className="button button--secondary" onClick={() => setShowLogout(true)}>
              Sign out
            </button>
          </div>
        </section>
      </div>

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
