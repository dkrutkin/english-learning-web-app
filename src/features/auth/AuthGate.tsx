import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { RouteFallback } from '../../components/layout/RouteFallback'
import { useAuth } from './AuthProvider'

export function ProtectedRoute() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <RouteFallback />
  if (status === 'unauthenticated') {
    return (
      <Navigate
        replace
        state={{
          from: `${location.pathname}${location.search}`,
          notice: 'Please sign in to continue.',
        }}
        to="/login"
      />
    )
  }
  return <Outlet />
}

export function PublicOnlyRoute() {
  const { status } = useAuth()
  if (status === 'loading') return <RouteFallback />
  if (status === 'authenticated') return <Navigate replace to="/app/home" />
  return <Outlet />
}
