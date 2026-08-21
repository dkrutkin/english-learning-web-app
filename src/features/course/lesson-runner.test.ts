import { beforeEach, describe, expect, it } from 'vitest'
import {
  completeLesson,
  getLessonSession,
  saveLessonSession,
  submitLessonAnswer,
  writePendingLessonSession,
} from './api/lesson-runner-api'
import { mockLessonBlocks, mockLessons } from './api/mock-course'
import { lessonBlocksResponseSchema } from './schemas/course'

const context = { userId: '00000000-0000-4000-8000-000000000001', isMock: true }

describe('lesson runner', () => {
  beforeEach(() => window.localStorage.clear())

  it('validates every block in the vertical module', () => {
    expect(lessonBlocksResponseSchema.parse(mockLessonBlocks)).toHaveLength(13)
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
      moduleCompleted: false,
      moduleCompletionPercent: 20,
      accuracyPercent: 100,
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
          moduleCompleted: true,
          moduleCompletionPercent: 100,
          unlockedAchievements: ['first-step', 'first-module'],
        })
      }
    }
  })
})
