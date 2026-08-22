import { beforeEach, describe, expect, it } from 'vitest'
import {
  completeLesson,
  getLessonReview,
  getLessonSession,
  saveLessonSession,
  submitLessonAnswer,
  writePendingLessonSession,
} from './api/lesson-runner-api'
import { mockAnswerKeys, mockLessonBlocks, mockLessons, mockModules } from './api/mock-course'
import { lessonBlocksResponseSchema } from './schemas/course'

const context = { userId: '00000000-0000-4000-8000-000000000001', isMock: true }

describe('lesson runner', () => {
  beforeEach(() => window.localStorage.clear())

  it('validates every block in the vertical module', () => {
    expect(lessonBlocksResponseSchema.parse(mockLessonBlocks)).toHaveLength(15)
  })

  it('autosaves and restores the current block and draft answers', async () => {
    const lesson = mockLessons[3]
    const block = mockLessonBlocks.find((entry) => entry.lesson_id === lesson.id)!
    await saveLessonSession(context, lesson.id, {
      currentBlockId: block.id,
      draftAnswers: { [block.id]: 'draft answer' },
      attempts: { [block.id]: 1 },
      feedback: {},
      usedHints: [block.id],
      score: 0,
      possibleScore: 1,
      completionPercent: 25,
      activeSeconds: 45,
      startedAt: '2026-08-21T10:00:00.000Z',
      completedAt: null,
      revision: 0,
    })

    await expect(getLessonSession(context, lesson.id)).resolves.toMatchObject({
      currentBlockId: block.id,
      draftAnswers: { [block.id]: 'draft answer' },
      attempts: { [block.id]: 1 },
      usedHints: [block.id],
      completionPercent: 25,
      activeSeconds: 45,
      revision: 1,
    })
  })

  it('prevents an older device revision from overwriting newer progress', async () => {
    const lesson = mockLessons[3]
    const block = mockLessonBlocks.find((entry) => entry.lesson_id === lesson.id)!
    const base = {
      currentBlockId: block.id,
      draftAnswers: {},
      attempts: {},
      feedback: {},
      usedHints: [],
      score: 0,
      possibleScore: 0,
      completionPercent: 0,
      activeSeconds: 0,
      startedAt: '2026-08-21T10:00:00.000Z',
      completedAt: null,
      revision: 0,
    }
    await saveLessonSession(context, lesson.id, base)
    await expect(saveLessonSession(context, lesson.id, base)).rejects.toThrow(
      'Session revision conflict',
    )
  })

  it('restores a locally queued session when the network save is unavailable', async () => {
    const lesson = mockLessons[3]
    const block = mockLessonBlocks.find((entry) => entry.lesson_id === lesson.id)!
    writePendingLessonSession(context.userId, {
      lessonId: lesson.id,
      currentBlockId: block.id,
      draftAnswers: { [block.id]: 'offline answer' },
      attempts: {},
      feedback: {},
      usedHints: [],
      score: 0,
      possibleScore: 0,
      completionPercent: 25,
      activeSeconds: 75,
      startedAt: '2026-08-21T10:00:00.000Z',
      completedAt: null,
      revision: 0,
      updatedAt: '2026-08-21T10:01:15.000Z',
    })

    await expect(getLessonSession(context, lesson.id)).resolves.toMatchObject({
      currentBlockId: block.id,
      draftAnswers: { [block.id]: 'offline answer' },
      completionPercent: 25,
      activeSeconds: 75,
    })
  })

  it('grades an answer and completes a lesson with module progress', async () => {
    const lesson = mockLessons[3]
    const gradedBlock = mockLessonBlocks.find(
      (entry) => entry.lesson_id === lesson.id && entry.is_graded,
    )!
    await expect(
      submitLessonAnswer(context, lesson.id, gradedBlock.id, 'achievement'),
    ).resolves.toMatchObject({ isCorrect: true, score: 1, maxScore: 1 })

    await expect(completeLesson(context, lesson.id)).resolves.toMatchObject({
      lessonCompleted: true,
      lessonKind: 'lesson',
      score: 1,
      possibleScore: 1,
      moduleCompleted: false,
      moduleCompletionPercent: 20,
      accuracyPercent: 100,
      nextLesson: {
        slug: 'present-perfect-essentials',
        title: 'Present perfect essentials',
      },
      unlockedAchievements: ['first-step'],
    })
  })

  it('tracks retries and applies the hint score reduction', async () => {
    const lesson = mockLessons[3]
    const block = mockLessonBlocks.find(
      (entry) => entry.lesson_id === lesson.id && entry.is_graded,
    )!
    await expect(
      submitLessonAnswer(context, lesson.id, block.id, 'wrong answer'),
    ).resolves.toMatchObject({ isCorrect: false, attemptNumber: 1, score: 0 })
    await expect(
      submitLessonAnswer(context, lesson.id, block.id, 'achievement', true),
    ).resolves.toMatchObject({
      isCorrect: true,
      attemptNumber: 2,
      score: 0.8,
      maxScore: 1,
      usedHint: true,
    })
    await expect(completeLesson(context, lesson.id)).resolves.toMatchObject({
      accuracyPercent: 80,
    })
  })

  it('restores saved mistakes after leaving a completed lesson', async () => {
    const lesson = mockLessons[3]
    const block = mockLessonBlocks.find(
      (entry) => entry.lesson_id === lesson.id && entry.is_graded,
    )!
    await submitLessonAnswer(context, lesson.id, block.id, 'wrong answer')
    await completeLesson(context, lesson.id)

    await expect(getLessonReview(context, lesson.id)).resolves.toMatchObject({
      lessonId: lesson.id,
      accuracyPercent: 0,
      items: [
        {
          blockId: block.id,
          isCorrect: false,
          userAnswer: 'wrong answer',
          correctAnswer: 'achievement',
        },
      ],
    })
  })

  it('normalizes capitalization and spaces in fill gap answers', async () => {
    const lesson = mockLessons[4]
    const block = mockLessonBlocks.find(
      (entry) => entry.lesson_id === lesson.id && entry.type === 'fill_gap',
    )!
    await expect(
      submitLessonAnswer(context, lesson.id, block.id, '  HAS  '),
    ).resolves.toMatchObject({ isCorrect: true, score: 1, attemptNumber: 1 })
  })

  it('completes the full module and unlocks the module achievement', async () => {
    const answersByLesson = [
      ['achievement'],
      ['has', ['She has finished the course.', 'I have visited Rome twice.']],
      ['She has become more independent.'],
      ['Speaking English every day'],
      [
        [
          'memorable',
          'have',
          'More independent',
          'Speaking English',
          'She has never tried surfing.',
        ],
      ],
    ]

    for (const [lessonIndex, lesson] of mockLessons.slice(3, 8).entries()) {
      const gradedBlocks = mockLessonBlocks.filter(
        (block) => block.lesson_id === lesson.id && block.is_graded,
      )
      for (const [blockIndex, block] of gradedBlocks.entries()) {
        await submitLessonAnswer(
          context,
          lesson.id,
          block.id,
          answersByLesson[lessonIndex][blockIndex] as string | string[],
        )
      }
      const result = await completeLesson(context, lesson.id)
      if (lessonIndex === 4) {
        expect(result).toMatchObject({
          lessonKind: 'module_assessment',
          moduleCompleted: true,
          moduleMastered: true,
          moduleCompletionPercent: 100,
          moduleAssessmentScore: 100,
          moduleStatus: 'mastered',
          moduleSealAwarded: true,
          nextLesson: { slug: 'level-assessment', title: 'B1 level assessment' },
          nextModule: { slug: 'work-and-opinions', title: 'Work and opinions' },
          unlockedAchievements: ['first-step', 'first-module'],
        })
      }
    }

    const progressKey = `fluent-course-progress:${context.userId}`
    const stored = JSON.parse(window.localStorage.getItem(progressKey) ?? '{}') as {
      modules: Array<Record<string, unknown>>
    }
    stored.modules = stored.modules.map((entry) =>
      entry.module_id === mockModules[3].id
        ? {
            ...entry,
            completion_percent: 100,
            average_accuracy: 90,
            assessment_score: 90,
            status: 'mastered',
          }
        : entry,
    )
    window.localStorage.setItem(progressKey, JSON.stringify(stored))

    const assessment = mockLessons.find((lesson) => lesson.slug === 'level-assessment')!
    const assessmentBlock = mockLessonBlocks.find(
      (block) => block.lesson_id === assessment.id && block.is_graded,
    )!
    await submitLessonAnswer(
      context,
      assessment.id,
      assessmentBlock.id,
      mockAnswerKeys[assessmentBlock.id],
    )
    await expect(completeLesson(context, assessment.id)).resolves.toMatchObject({
      lessonKind: 'level_assessment',
      levelCompleted: true,
      levelMastered: true,
      levelAssessmentScore: 100,
      levelStatus: 'mastered',
      levelEmblemAwarded: true,
      unlockedAchievements: ['first-step', 'first-module', 'level-complete'],
    })
  })
})
