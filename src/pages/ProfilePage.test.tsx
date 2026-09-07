import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProfilePage } from './ProfilePage'

const profileState = vi.hoisted(() => ({
  data: {
    id: 'user-1',
    email: 'learner@example.com',
    displayName: 'Dmitry Learner',
    avatarPath: null,
    avatarUrl: null,
    currentLevel: { id: 'level-b1', cefr: 'B1', title: 'Independent English' },
    learningGoal: 'career',
    weeklyGoal: 5,
    theme: 'dark',
    showTranslations: false,
  },
  isPending: false,
  isError: false,
  refetch: vi.fn(),
}))
const updateProfile = vi.hoisted(() => ({ isPending: false, mutateAsync: vi.fn() }))
const avatarMutation = vi.hoisted(() => ({ isPending: false, mutateAsync: vi.fn() }))

vi.mock('../features/profile/hooks', () => ({
  useAccountProfile: () => profileState,
  useUpdateAccountProfile: () => updateProfile,
  useAvatarMutation: () => avatarMutation,
}))
vi.mock('../features/course/hooks/use-course', () => ({
  useProgressSummary: () => ({
    data: {
      lessonsCompleted: 7,
      lessonsTotal: 24,
      averageAccuracy: 86,
      streak: { currentDays: 3, longestDays: 8 },
    },
  }),
}))

describe('ProfilePage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows account and learning data and saves profile edits', async () => {
    const user = userEvent.setup()
    render(<ProfilePage />)

    expect(screen.getByRole('heading', { name: 'Dmitry Learner' })).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('86%')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Edit profile' }))
    const name = screen.getByLabelText('Display name')
    await user.clear(name)
    await user.type(name, 'Dmitry Krutkin')
    await user.selectOptions(screen.getByLabelText('Learning goal'), 'travel')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(updateProfile.mutateAsync).toHaveBeenCalledWith({
      displayName: 'Dmitry Krutkin',
      learningGoal: 'travel',
    })
  })
})
