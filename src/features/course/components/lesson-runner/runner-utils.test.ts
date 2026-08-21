import { describe, expect, it } from 'vitest'
import { mockLessonBlocks } from '../../api/mock-course'
import { lessonBlocksResponseSchema } from '../../schemas/course'
import {
  createInitialRunnerState,
  hasAnswer,
  lessonRunnerReducer,
  requiresAnswer,
} from './runner-utils'

describe('lesson runner state', () => {
  const blocks = lessonBlocksResponseSchema.parse(mockLessonBlocks)
  const block = blocks[0]

  it('restores all persisted fields', () => {
    const state = createInitialRunnerState(blocks, {
      lessonId: block.lessonId,
      currentBlockId: block.id,
      draftAnswers: { [block.id]: 'answer' },
      attempts: { [block.id]: 2 },
      feedback: {},
      usedHints: [block.id],
      score: 0.8,
      possibleScore: 1,
      completionPercent: 50,
      activeSeconds: 90,
      startedAt: '2026-08-21T10:00:00.000Z',
      completedAt: null,
      revision: 3,
      updatedAt: new Date().toISOString(),
    })
    expect(state).toMatchObject({
      currentIndex: 0,
      answers: { [block.id]: 'answer' },
      attempts: { [block.id]: 2 },
      usedHints: [block.id],
      score: 0.8,
      activeSeconds: 90,
      revision: 3,
    })
  })

  it('updates score and attempt count from feedback', () => {
    const initial = createInitialRunnerState(blocks, null)
    const state = lessonRunnerReducer(initial, {
      type: 'feedback',
      blockId: block.id,
      feedback: {
        isCorrect: true,
        score: 0.8,
        maxScore: 1,
        attemptNumber: 2,
        usedHint: true,
      },
    })
    expect(state).toMatchObject({
      attempts: { [block.id]: 2 },
      score: 0.8,
      possibleScore: 1,
    })
  })

  it('requires complete interactive answers including ungraded writing', () => {
    const writingBlock = {
      ...block,
      type: 'writing_prompt' as const,
      content: { prompt: 'Describe an experience' },
      isRequired: true,
      isGraded: false,
    }
    const matchingBlock = {
      ...block,
      type: 'matching' as const,
      content: {
        prompt: 'Match',
        pairs: [
          { left: 'one', right: 'first' },
          { left: 'two', right: 'second' },
        ],
      },
    }

    expect(requiresAnswer(writingBlock)).toBe(true)
    expect(hasAnswer('', writingBlock)).toBe(false)
    expect(hasAnswer('My first trip', writingBlock)).toBe(true)
    expect(hasAnswer({ one: 'first' }, matchingBlock)).toBe(false)
    expect(hasAnswer({ one: 'first', two: 'second' }, matchingBlock)).toBe(true)
  })
})
