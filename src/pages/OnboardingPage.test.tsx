import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OnboardingPage } from './OnboardingPage'

const onboarding = vi.hoisted(() => ({
  complete: vi.fn().mockResolvedValue(undefined),
  loadDraft: vi.fn().mockReturnValue(null),
  saveDraft: vi.fn(),
  refetch: vi.fn(),
}))

vi.mock('../features/auth/AuthProvider', () => ({
  useAuth: () => ({
    isMock: true,
    user: { id: 'demo-user' },
  }),
}))

vi.mock('../features/onboarding/hooks', () => ({
  onboardingStatusQueryKey: (userId: string) => ['profile', userId, 'onboarding'],
  useOnboardingStatus: () => ({
    data: false,
    isError: false,
    isPending: false,
    refetch: onboarding.refetch,
  }),
}))

vi.mock('../features/onboarding/api', () => ({
  completeOnboarding: onboarding.complete,
  loadOnboardingDraft: onboarding.loadDraft,
  saveOnboardingDraft: onboarding.saveDraft,
}))

function renderOnboarding() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/onboarding']}>
        <Routes>
          <Route element={<OnboardingPage />} path="/onboarding" />
          <Route element={<p>Dashboard loaded</p>} path="/app/home" />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('OnboardingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    onboarding.complete.mockResolvedValue(undefined)
    onboarding.loadDraft.mockReturnValue(null)
  })

  it('requires a level and goal before continuing', async () => {
    const user = userEvent.setup()
    renderOnboarding()

    expect(
      screen.getByRole('heading', { name: "What's your current English level?" }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Step 1 of 4')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /get started/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled()
    const selectedLevel = screen.getByRole('radio', { name: /B1Intermediate/i })
    await user.click(selectedLevel)
    expect(selectedLevel.closest('label')).toHaveClass('onboarding-option', 'is-selected')
    expect(screen.getByRole('button', { name: /continue/i })).toBeEnabled()
  })

  it('completes all four steps and opens the dashboard', async () => {
    const user = userEvent.setup()
    renderOnboarding()

    await user.click(screen.getByRole('radio', { name: /B1Intermediate/i }))
    await user.click(screen.getByRole('button', { name: /continue/i }))
    await user.click(screen.getByRole('radio', { name: /Career/i }))
    await user.click(screen.getByRole('button', { name: /continue/i }))

    expect(screen.getByRole('radio', { name: /Consistent/i })).toBeChecked()
    await user.click(screen.getByRole('button', { name: /continue/i }))

    expect(screen.getByText('B1 · Intermediate')).toBeInTheDocument()
    expect(screen.getByText('Career')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /start learning/i }))

    await waitFor(() => {
      expect(onboarding.complete).toHaveBeenCalledWith('demo-user', true, {
        step: 4,
        currentLevel: 'B1',
        learningGoal: 'career',
        weeklyGoal: 5,
      })
    })
    expect(await screen.findByText('Dashboard loaded')).toBeInTheDocument()
  })
})
