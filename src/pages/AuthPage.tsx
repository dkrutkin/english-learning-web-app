import { type FormEvent, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider'
import {
  authErrorMessage,
  credentialsSchema,
  emailSchema,
  passwordConfirmationSchema,
} from '../features/auth/validation'

type AuthMode = 'login' | 'signup' | 'forgot-password' | 'reset-password'
type LocationState = { email?: string; from?: string; notice?: string }

const content: Record<
  AuthMode,
  { title: string; description: string; submit: string; pending: string }
> = {
  login: {
    title: 'Welcome back',
    description: 'Continue where you left off.',
    submit: 'Sign in',
    pending: 'Signing in…',
  },
  signup: {
    title: 'Create your account',
    description: 'Start your journey from A2 to C1.',
    submit: 'Create account',
    pending: 'Creating account…',
  },
  'forgot-password': {
    title: 'Reset your password',
    description: "Enter your email and we'll send you a password reset link.",
    submit: 'Send reset link',
    pending: 'Sending link…',
  },
  'reset-password': {
    title: 'Create a new password',
    description: 'Use at least 8 characters.',
    submit: 'Update password',
    pending: 'Updating password…',
  },
}

const fieldValue = (form: FormData, name: string) => String(form.get(name) ?? '')

export function AuthPage({ mode }: { mode: AuthMode }) {
  const auth = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as LocationState | null
  const current = content[mode]
  const needsEmail = mode !== 'reset-password'
  const needsPassword = mode === 'login' || mode === 'signup' || mode === 'reset-password'
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(state?.notice ?? null)

  async function handleDemoSignIn() {
    if (!auth.mockCredentials) return

    setError(null)
    setNotice(null)
    setIsSubmitting(true)
    try {
      await auth.signIn(auth.mockCredentials.email, auth.mockCredentials.password)
      const destination = state?.from?.startsWith('/') ? state.from : '/app/home'
      navigate(destination, { replace: true })
    } catch (submissionError) {
      setError(authErrorMessage(submissionError))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setNotice(null)

    const form = new FormData(event.currentTarget)
    const email = fieldValue(form, 'email')
    const password = fieldValue(form, 'password')
    const confirmPassword = fieldValue(form, 'confirmPassword')
    const validation =
      mode === 'forgot-password'
        ? emailSchema.safeParse(email)
        : mode === 'login'
          ? credentialsSchema.safeParse({ email, password })
          : mode === 'signup'
            ? credentialsSchema
                .and(passwordConfirmationSchema)
                .safeParse({ email, password, confirmPassword })
            : passwordConfirmationSchema.safeParse({ password, confirmPassword })

    if (!validation.success) {
      setError(validation.error.issues[0]?.message ?? 'Check the form and try again.')
      return
    }

    setIsSubmitting(true)
    try {
      if (mode === 'login') {
        await auth.signIn(email, password)
        const destination = state?.from?.startsWith('/') ? state.from : '/app/home'
        navigate(destination, { replace: true })
      } else if (mode === 'signup') {
        const { needsEmailConfirmation } = await auth.signUp(email, password)
        navigate(needsEmailConfirmation ? '/confirm-email' : '/onboarding', {
          replace: true,
          state: { email },
        })
      } else if (mode === 'forgot-password') {
        await auth.requestPasswordReset(email)
        setNotice('Check your email for a password reset link.')
        event.currentTarget.reset()
      } else {
        await auth.updatePassword(password)
        navigate('/login', {
          replace: true,
          state: { notice: 'Password updated. Sign in with your new password.' },
        })
      }
    } catch (submissionError) {
      setError(authErrorMessage(submissionError))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link className="brand brand--center" to="/">
          <span>Fluent</span>
        </Link>
        <div className="auth-heading">
          <h1>{current.title}</h1>
          <p>{current.description}</p>
        </div>
        {import.meta.env.DEV && mode === 'login' && auth.mockCredentials && (
          <aside className="demo-account-note">
            <div>
              <strong>Local demo account</strong>
              <span>{auth.mockCredentials.email}</span>
            </div>
            <button
              className="button button--secondary button--full"
              disabled={isSubmitting}
              onClick={handleDemoSignIn}
              type="button"
            >
              Continue with demo account
            </button>
          </aside>
        )}
        {!auth.isConfigured && (
          <p className="form-message form-message--error" role="alert">
            Authentication is not configured. Add the Supabase environment variables.
          </p>
        )}
        {notice && (
          <p className="form-message form-message--success" role="status">
            {notice}
          </p>
        )}
        {error && (
          <p className="form-message form-message--error" role="alert">
            {error}
          </p>
        )}
        <form noValidate onSubmit={handleSubmit}>
          {needsEmail && (
            <label>
              Email
              <input
                autoComplete="email"
                defaultValue={state?.email}
                disabled={isSubmitting}
                name="email"
                placeholder="name@example.com"
                required
                type="email"
              />
            </label>
          )}
          {needsPassword && (
            <label>
              {mode === 'reset-password' ? 'New password' : 'Password'}
              <input
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                disabled={isSubmitting}
                minLength={8}
                name="password"
                required
                type="password"
              />
            </label>
          )}
          {(mode === 'signup' || mode === 'reset-password') && (
            <label>
              Confirm password
              <input
                autoComplete="new-password"
                disabled={isSubmitting}
                minLength={8}
                name="confirmPassword"
                required
                type="password"
              />
            </label>
          )}
          {mode === 'login' && (
            <Link className="form-link" to="/forgot-password">
              Forgot password?
            </Link>
          )}
          <button
            className="button button--primary button--large button--full"
            disabled={isSubmitting || !auth.isConfigured}
            type="submit"
          >
            {isSubmitting ? current.pending : current.submit}
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
