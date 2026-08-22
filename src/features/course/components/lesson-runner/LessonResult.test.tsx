import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import type { LessonResult as LessonResultType } from '../../types/course'
import { LessonResult } from './LessonResult'

afterEach(cleanup)

const result: LessonResultType = {
  lessonCompleted: true,
  lessonKind: 'module_assessment',
  score: 4,
  possibleScore: 5,
  accuracyPercent: 80,
  skillBreakdown: [
    { skill: 'grammar', score: 2, maxScore: 2, accuracyPercent: 100 },
    { skill: 'mixed', score: 2, maxScore: 3, accuracyPercent: 66.67 },
  ],
  answerReview: [
    {
      blockId: '40000000-0000-4000-8000-000000000001',
      title: 'Present perfect',
      skill: 'grammar',
      isCorrect: true,
      score: 1,
      maxScore: 1,
      userAnswer: 'have',
      correctAnswer: 'have',
    },
    {
      blockId: '40000000-0000-4000-8000-000000000002',
      title: 'Experience vocabulary',
      skill: 'vocabulary',
      isCorrect: false,
      score: 0,
      maxScore: 1,
      userAnswer: 'ordinary',
      correctAnswer: 'memorable',
    },
  ],
  nextLesson: null,
  moduleCompleted: true,
  moduleMastered: false,
  moduleCompletionPercent: 100,
  moduleAssessmentScore: 80,
  moduleStatus: 'completed',
  moduleSealAwarded: true,
  nextModule: { slug: 'work-and-opinions', title: 'Work and opinions' },
  levelCompleted: false,
  levelMastered: false,
  levelCompletionPercent: 50,
  levelAssessmentScore: 80,
  levelStatus: 'in_progress',
  levelEmblemAwarded: false,
  nextLevel: null,
  unlockedAchievements: ['first-module'],
}

describe('LessonResult', () => {
  it('shows assessment statistics, module seal and the next module', () => {
    render(
      <MemoryRouter>
        <LessonResult levelSlug="b1" moduleSlug="experiences-and-stories" result={result} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Module complete' })).toBeVisible()
    expect(screen.getByText('Module Seal')).toBeVisible()
    expect(screen.getAllByText('80%').length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: /Open next module/ })).toHaveAttribute(
      'href',
      '/app/learn/b1/work-and-opinions',
    )
  })

  it('opens a focused mistake review with the correct answer', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <LessonResult levelSlug="b1" moduleSlug="experiences-and-stories" result={result} />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: /Review mistakes/ }))
    expect(screen.getByRole('heading', { name: 'Mistakes to review' })).toBeVisible()
    expect(screen.getByText('ordinary')).toBeVisible()
    expect(screen.getByText('memorable')).toBeVisible()
    expect(screen.queryByText('have')).not.toBeInTheDocument()
  })
})
