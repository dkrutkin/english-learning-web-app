import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AchievementDetailModal } from './AchievementsPage'

const achievement = {
  id: '81000000-0000-4000-8000-000000000004',
  slug: 'consistent-week',
  title: 'Consistent Week',
  description: 'Study on seven consecutive days',
  category: 'consistency',
  icon: 'flame',
  unlocked: false,
  unlockedAt: null,
  currentValue: 4,
  targetValue: 7,
  progressPercent: 57,
}

describe('AchievementDetailModal', () => {
  it('shows progress for a locked achievement and closes with Escape', async () => {
    const onClose = vi.fn()
    render(<AchievementDetailModal achievement={achievement} onClose={onClose} />)

    expect(screen.getByRole('dialog', { name: 'Consistent Week' })).toBeInTheDocument()
    expect(screen.getByText('4 / 7')).toBeInTheDocument()
    expect(screen.getByText('Locked')).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })
})
