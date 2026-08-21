import { Link } from 'react-router-dom'

type AuthMode = 'login' | 'signup' | 'forgot-password' | 'reset-password'
const content: Record<AuthMode, { title: string; description: string; submit: string }> = {
  login: { title: 'Welcome back', description: 'Continue where you left off.', submit: 'Sign in' },
  signup: {
    title: 'Create your account',
    description: 'Start your journey from A2 to C1.',
    submit: 'Create account',
  },
  'forgot-password': {
    title: 'Reset your password',
    description: "Enter your email and we'll send you a password reset link.",
    submit: 'Send reset link',
  },
  'reset-password': {
    title: 'Create a new password',
    description: 'Use at least 8 characters.',
    submit: 'Update password',
  },
}

export function AuthPage({ mode }: { mode: AuthMode }) {
  const current = content[mode]
  const needsEmail = mode !== 'reset-password'
  const needsPassword = mode === 'login' || mode === 'signup' || mode === 'reset-password'
  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link className="brand brand--center" to="/">
          <span className="brand-mark">F</span>
          <span>Fluent</span>
        </Link>
        <div className="auth-heading">
          <h1>{current.title}</h1>
          <p>{current.description}</p>
        </div>
        <form onSubmit={(event) => event.preventDefault()}>
          {needsEmail && (
            <label>
              Email
              <input
                autoComplete="email"
                name="email"
                placeholder="name@example.com"
                type="email"
              />
            </label>
          )}
          {needsPassword && (
            <label>
              {mode === 'reset-password' ? 'New password' : 'Password'}
              <input
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={8}
                name="password"
                type="password"
              />
            </label>
          )}
          {(mode === 'signup' || mode === 'reset-password') && (
            <label>
              Confirm password
              <input
                autoComplete="new-password"
                minLength={8}
                name="confirmPassword"
                type="password"
              />
            </label>
          )}
          {mode === 'login' && (
            <Link className="form-link" to="/forgot-password">
              Forgot password?
            </Link>
          )}
          <button className="button button--primary button--large button--full" type="submit">
            {current.submit}
          </button>
        </form>
        {mode === 'login' && (
          <p className="auth-footer">
            Don't have an account? <Link to="/signup">Create account</Link>
          </p>
        )}
        {mode === 'signup' && (
          <p className="auth-footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        )}
        {(mode === 'forgot-password' || mode === 'reset-password') && (
          <p className="auth-footer">
            <Link to="/login">Back to sign in</Link>
          </p>
        )}
      </section>
    </main>
  )
}
