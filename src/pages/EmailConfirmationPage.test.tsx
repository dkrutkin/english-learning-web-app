import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EmailConfirmationPage } from './EmailConfirmationPage'

const auth = vi.hoisted(() => ({
  status: 'unauthenticated',
  resendConfirmation: vi.fn(),
}))

vi.mock('../features/auth/AuthProvider', () => ({ useAuth: () => auth }))

describe('EmailConfirmationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.sessionStorage.clear()
  })

  it('resends the confirmation email and starts a cooldown', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter
        initialEntries={[{ pathname: '/confirm-email', state: { email: 'learner@example.com' } }]}
      >
        <EmailConfirmationPage />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Resend confirmation email' }))

    expect(auth.resendConfirmation).toHaveBeenCalledWith('learner@example.com')
    expect(await screen.findByRole('status')).toHaveTextContent(
      'A new confirmation email has been sent.',
    )
    expect(screen.getByRole('button', { name: 'Resend in 60s' })).toBeDisabled()
  })

  it('restores the email and cooldown after a page reload', () => {
    window.sessionStorage.setItem(
      'fluent-pending-email-confirmation',
      JSON.stringify({ email: 'saved@example.com', resendAvailableAt: Date.now() + 45_000 }),
    )

    render(
      <MemoryRouter initialEntries={['/confirm-email']}>
        <EmailConfirmationPage />
      </MemoryRouter>,
    )

    expect(screen.getByText(/saved@example.com/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Resend in 4[45]s/ })).toBeDisabled()
  })

  it('accepts an email when the confirmation page was opened directly', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/confirm-email']}>
        <EmailConfirmationPage />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('Email'), 'direct@example.com')
    await user.click(screen.getByRole('button', { name: 'Resend confirmation email' }))

    expect(auth.resendConfirmation).toHaveBeenCalledWith('direct@example.com')
  })
})
