import { describe, expect, it } from 'vitest'
import { mockLessonProgress, mockLessons, mockLevels, mockModules } from './api/mock-course'
import { getCourseLevels, getUserCourseProfile } from './api/course-api'
import {
  lessonBlockRowSchema,
  lessonProgressResponseSchema,
  lessonsResponseSchema,
  levelRowSchema,
  levelsResponseSchema,
  modulesResponseSchema,
} from './schemas/course'
import { findRecommendedLesson, mergeLevelsWithProgress } from './utils/course'

describe('course data validation', () => {
  it('accepts safe roadmap metadata for upcoming levels', () => {
    expect(levelRowSchema.parse(mockLevels[2])).toMatchObject({ cefr: 'B2', status: 'draft' })
    expect(levelsResponseSchema.parse(mockLevels)).toHaveLength(4)
  })

  it('returns the complete mock roadmap and the current profile name', async () => {
    const context = { userId: '00000000-0000-4000-8000-000000000001', isMock: true }
    await expect(getCourseLevels(context)).resolves.toHaveLength(4)
    await expect(getUserCourseProfile(context)).resolves.toEqual({ displayName: 'Demo Learner' })
  })

  it('keeps unpublished roadmap levels locked', () => {
    const levels = levelsResponseSchema.parse(mockLevels)
    const roadmap = mergeLevelsWithProgress(levels, {
      levels: [],
      modules: [],
      lessons: [],
    })

    expect(roadmap.find((level) => level.cefr === 'B2')?.progress.status).toBe('locked')
    expect(roadmap.find((level) => level.cefr === 'C1')?.progress.status).toBe('locked')
  })

  it('validates the JSON content for each lesson block type', () => {
    expect(() =>
      lessonBlockRowSchema.parse({
        id: '40000000-0000-4000-8000-000000000099',
        lesson_id: mockLessons[0].id,
        type: 'grammar',
        title: 'Invalid grammar block',
        content: { body: 'The required explanation is missing' },
        order_index: 1,
        is_required: true,
        is_graded: false,
      }),
    ).toThrow(/Invalid grammar block content/)
  })
})

describe('recommended lesson', () => {
  const levels = levelsResponseSchema.parse(mockLevels)
  const modules = modulesResponseSchema.parse(mockModules)
  const lessons = lessonsResponseSchema.parse(mockLessons)

  it('prefers the most recently active lesson in progress', () => {
    const progress = {
      levels: [],
      modules: [],
      lessons: lessonProgressResponseSchema.parse(mockLessonProgress),
    }

    expect(findRecommendedLesson(levels, modules, lessons, progress)?.lesson.slug).toBe(
      'talking-about-experiences',
    )
  })

  it('falls back to the first uncompleted lesson in course order', () => {
    const progress = {
      levels: [],
      modules: [],
      lessons: lessonProgressResponseSchema.parse(
        mockLessonProgress.map((entry) =>
          entry.status === 'in_progress'
            ? { ...entry, status: 'not_started', completion_percent: 0 }
            : entry,
        ),
      ),
    }

    expect(findRecommendedLesson(levels, modules, lessons, progress)?.lesson.slug).toBe(
      'talking-about-experiences',
    )
  })
})
