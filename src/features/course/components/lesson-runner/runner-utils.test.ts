import { describe, expect, it } from 'vitest'
import { mockLessonBlocks } from '../../api/mock-course'
import { lessonBlocksResponseSchema } from '../../schemas/course'
import { createInitialRunnerState, lessonRunnerReducer } from './runner-utils'

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
      updatedAt: new Date().toISOString(),
    })
    expect(state).toMatchObject({
      currentIndex: 0,
      answers: { [block.id]: 'answer' },
      attempts: { [block.id]: 2 },
      usedHints: [block.id],
      score: 0.8,
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
})
