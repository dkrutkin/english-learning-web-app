import { MailCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider'
import {
  clearPendingConfirmation,
  confirmationSecondsRemaining,
  getPendingConfirmation,
  restartConfirmationCooldown,
} from '../features/auth/pending-confirmation'
import { authErrorMessage, emailSchema } from '../features/auth/validation'

export function EmailConfirmationPage() {
  const auth = useAuth()
  const { status } = auth
  const location = useLocation()
  const navigate = useNavigate()
  const [storedConfirmation] = useState(getPendingConfirmation)
  const initialEmail =
    (location.state as { email?: string } | null)?.email ?? storedConfirmation?.email ?? ''
  const [email, setEmail] = useState(initialEmail)
  const [secondsRemaining, setSecondsRemaining] = useState(() =>
    confirmationSecondsRemaining(storedConfirmation?.resendAvailableAt ?? 0),
  )
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'authenticated') {
      clearPendingConfirmation()
      navigate('/onboarding', { replace: true })
    }
  }, [navigate, status])

  useEffect(() => {
    if (secondsRemaining <= 0) return
    const timer = window.setInterval(() => {
      setSecondsRemaining((current) => Math.max(0, current - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [secondsRemaining])

  async function handleResend() {
    if (secondsRemaining > 0) return
    setError(null)
    setNotice(null)
    const validatedEmail = emailSchema.safeParse(email)
    if (!validatedEmail.success) {
      setError(validatedEmail.error.issues[0]?.message ?? 'Enter a valid email address.')
      return
    }
    setIsSending(true)
    try {
      await auth.resendConfirmation(validatedEmail.data)
      restartConfirmationCooldown(validatedEmail.data)
      setSecondsRemaining(60)
      setNotice('A new confirmation email has been sent.')
    } catch (sendError) {
      setError(authErrorMessage(sendError))
    } finally {
      setIsSending(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card auth-card--message">
        <span className="auth-message-icon">
          <MailCheck aria-hidden="true" size={26} />
        </span>
        <div className="auth-heading">
          <h1>Check your email</h1>
          <p>
            We sent a confirmation link{initialEmail ? ` to ${initialEmail}` : ''}. Open it to
            activate your account.
          </p>
        </div>
        {error ? (
          <p className="form-message form-message--error" role="alert">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="form-message form-message--success" role="status">
            {notice}
          </p>
        ) : null}
        <p className="auth-help">You can close this page after opening the confirmation link.</p>
        {!initialEmail ? (
          <label className="confirmation-email-field">
            Email
            <input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              type="email"
              value={email}
            />
          </label>
        ) : null}
        <button
          className="button button--primary button--full"
          disabled={isSending || secondsRemaining > 0 || !email.trim()}
          onClick={() => void handleResend()}
          type="button"
        >
          {isSending
            ? 'Sending…'
            : secondsRemaining > 0
              ? `Resend in ${secondsRemaining}s`
              : 'Resend confirmation email'}
        </button>
        <Link className="button button--secondary button--full" to="/login">
          Back to sign in
        </Link>
      </section>
    </main>
  )
}
