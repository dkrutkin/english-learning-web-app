import { beforeEach, describe, expect, it } from 'vitest'
import { getProgressSummary } from './api/progress-summary-api'
import { submitLessonAnswer } from './api/lesson-runner-api'
import { mockLessonBlocks, mockLessons } from './api/mock-course'

const context = { userId: '00000000-0000-4000-8000-000000000010', isMock: true }

describe('progress summary', () => {
  beforeEach(() => window.localStorage.clear())

  it('returns one consistent course-wide progress snapshot', async () => {
    const summary = await getProgressSummary(context)

    expect(summary.activity).toHaveLength(84)
    expect(summary.levelsTotal).toBe(4)
    expect(summary.currentLevel?.cefr).toBe('B1')
    expect(summary.weeklyGoal).toMatchObject({ targetDays: 5 })
    expect(summary.streak.currentDays).toBeLessThanOrEqual(summary.streak.longestDays)
    expect(summary.milestones.map((milestone) => milestone.slug)).toContain('first-step')
    expect(summary.courseProgress.levels).not.toHaveLength(0)
  })

  it('derives skill performance from saved exercise attempts', async () => {
    const lesson = mockLessons[3]
    const block = mockLessonBlocks.find(
      (candidate) => candidate.lesson_id === lesson.id && candidate.is_graded,
    )!

    await submitLessonAnswer(context, lesson.id, block.id, 'achievement')
    const summary = await getProgressSummary(context)
    const vocabulary = summary.skills.find((skill) => skill.slug === 'vocabulary')

    expect(vocabulary).toMatchObject({
      attempts: 1,
      earnedPoints: 1,
      possiblePoints: 1,
      performancePercent: 100,
    })
  })
})
