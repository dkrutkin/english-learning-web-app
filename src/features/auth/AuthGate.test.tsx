import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProtectedRoute, PublicOnlyRoute } from './AuthGate'

const authState = vi.hoisted(() => ({
  status: 'unauthenticated' as 'loading' | 'authenticated' | 'unauthenticated',
}))

vi.mock('./AuthProvider', () => ({ useAuth: () => authState }))

function LoginPage() {
  const location = useLocation()
  const notice = (location.state as { notice?: string } | null)?.notice
  return <div>Login page {notice}</div>
}

describe('auth route guards', () => {
  beforeEach(() => {
    authState.status = 'unauthenticated'
  })

  it('redirects a guest from a protected route to login', () => {
    render(
      <MemoryRouter initialEntries={['/app/home']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route element={<div>Private home</div>} path="/app/home" />
          </Route>
          <Route element={<LoginPage />} path="/login" />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText(/Login page Please sign in to continue/)).toBeInTheDocument()
    expect(screen.queryByText('Private home')).not.toBeInTheDocument()
  })

  it('renders protected content for an authenticated user', () => {
    authState.status = 'authenticated'
    render(
      <MemoryRouter initialEntries={['/app/home']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route element={<div>Private home</div>} path="/app/home" />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Private home')).toBeInTheDocument()
  })

  it('redirects an authenticated user away from login', () => {
    authState.status = 'authenticated'
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route element={<PublicOnlyRoute />}>
            <Route element={<div>Login form</div>} path="/login" />
          </Route>
          <Route element={<div>Private home</div>} path="/app/home" />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Private home')).toBeInTheDocument()
    expect(screen.queryByText('Login form')).not.toBeInTheDocument()
  })

  it('shows a loading state while the session is being restored', () => {
    authState.status = 'loading'
    render(
      <MemoryRouter initialEntries={['/app/home']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route element={<div>Private home</div>} path="/app/home" />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('main', { name: 'Loading page' })).toBeInTheDocument()
  })
})
