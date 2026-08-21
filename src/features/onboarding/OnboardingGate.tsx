import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { RouteFallback } from '../../components/layout/RouteFallback'
import { useOnboardingStatus } from './hooks'

export function OnboardingGate() {
  const location = useLocation()
  const status = useOnboardingStatus()

  if (status.isPending) return <RouteFallback />

  if (status.isError) {
    return (
      <main className="empty-page">
        <h1>We couldn't load your profile</h1>
        <p>Check your connection and try again.</p>
        <button className="button button--primary" onClick={() => status.refetch()}>
          Try again
        </button>
      </main>
    )
  }

  if (!status.data) {
    return (
      <Navigate
        replace
        state={{ from: `${location.pathname}${location.search}` }}
        to="/onboarding"
      />
    )
  }

  return <Outlet />
}
