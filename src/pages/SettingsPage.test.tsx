import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from '../features/theme/ThemeProvider'
import { SettingsPage } from './SettingsPage'

const auth = vi.hoisted(() => ({
  user: { email: 'learner@example.com' },
  changePassword: vi.fn(),
  signOut: vi.fn(),
}))
const profileState = vi.hoisted(() => ({
  data: {
    weeklyGoal: 5,
    showTranslations: false,
  },
}))
const updateProfile = vi.hoisted(() => ({ isPending: false, mutateAsync: vi.fn() }))

vi.mock('../features/auth/AuthProvider', () => ({ useAuth: () => auth }))
vi.mock('../features/profile/hooks', () => ({
  useAccountProfile: () => profileState,
  useUpdateAccountProfile: () => updateProfile,
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <SettingsPage />
      </ThemeProvider>
    </MemoryRouter>,
  )
}

describe('SettingsPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('saves translation and weekly goal preferences', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('switch', { name: 'Show translations' }))
    await user.click(screen.getByRole('button', { name: '3 days' }))

    expect(updateProfile.mutateAsync).toHaveBeenNthCalledWith(1, { showTranslations: true })
    expect(updateProfile.mutateAsync).toHaveBeenNthCalledWith(2, { weeklyGoal: 3 })
  })

  it('validates and changes the password', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Change password' }))
    await user.type(screen.getByLabelText('Current password'), 'old-password')
    await user.type(screen.getByLabelText('New password'), 'new-password')
    await user.type(screen.getByLabelText('Confirm new password'), 'new-password')
    await user.click(screen.getByRole('button', { name: 'Update password' }))

    expect(auth.changePassword).toHaveBeenCalledWith('old-password', 'new-password')
  })
})
