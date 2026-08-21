import { MailCheck } from 'lucide-react'
import { useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider'

export function EmailConfirmationPage() {
  const { status } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const email = (location.state as { email?: string } | null)?.email

  useEffect(() => {
    if (status === 'authenticated') navigate('/onboarding', { replace: true })
  }, [navigate, status])

  return (
    <main className="auth-page">
      <section className="auth-card auth-card--message">
        <span className="auth-message-icon">
          <MailCheck aria-hidden="true" size={26} />
        </span>
        <div className="auth-heading">
          <h1>Check your email</h1>
          <p>
            We sent a confirmation link{email ? ` to ${email}` : ''}. Open it to activate your
            account.
          </p>
        </div>
        <p className="auth-help">You can close this page after opening the confirmation link.</p>
        <Link className="button button--secondary button--full" to="/login">
          Back to sign in
        </Link>
      </section>
    </main>
  )
}
