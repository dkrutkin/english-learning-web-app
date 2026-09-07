import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthPage } from './AuthPage'

const auth = vi.hoisted(() => ({
  isConfigured: true,
  isMock: false,
  mockCredentials: null,
  signIn: vi.fn(),
  signUp: vi.fn(),
  requestPasswordReset: vi.fn(),
  updatePassword: vi.fn(),
}))

vi.mock('../features/auth/AuthProvider', () => ({ useAuth: () => auth }))

describe('AuthPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.sessionStorage.clear()
  })

  it('remembers the pending email after signup', async () => {
    auth.signUp.mockResolvedValueOnce({ needsEmailConfirmation: true })
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AuthPage mode="signup" />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('Email'), 'learner@example.com')
    await user.type(screen.getByLabelText('Password'), 'secure-pass')
    await user.type(screen.getByLabelText('Confirm password'), 'secure-pass')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(window.sessionStorage.getItem('fluent-pending-email-confirmation')).toContain(
      'learner@example.com',
    )
  })

  it('submits valid login credentials', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AuthPage mode="login" />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('Email'), 'learner@example.com')
    await user.type(screen.getByLabelText('Password'), 'secure-pass')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(auth.signIn).toHaveBeenCalledWith('learner@example.com', 'secure-pass')
  })

  it('does not submit signup when passwords differ', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AuthPage mode="signup" />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('Email'), 'learner@example.com')
    await user.type(screen.getByLabelText('Password'), 'secure-pass')
    await user.type(screen.getByLabelText('Confirm password'), 'different-pass')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Passwords do not match.')
    expect(auth.signUp).not.toHaveBeenCalled()
  })
})
