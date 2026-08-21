import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <main className="empty-page">
      <Link className="brand brand--center" to="/">
        <span>Fluent</span>
      </Link>
      <h1>Page not found</h1>
      <p>The page you requested does not exist or is no longer available.</p>
      <Link className="button button--primary" to="/app/home">
        Go to Home
      </Link>
    </main>
  )
}
