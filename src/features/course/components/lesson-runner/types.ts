import type { AnswerResult, LessonAnswer, LessonResult } from '../../types/course'

export type RunnerState = {
  currentIndex: number
  answers: Record<string, unknown>
  attempts: Record<string, number>
  feedback: Record<string, AnswerResult>
  usedHints: string[]
  score: number
  possibleScore: number
  result: LessonResult | null
}

export type RunnerAction =
  | { type: 'answer'; blockId: string; answer: LessonAnswer }
  | { type: 'feedback'; blockId: string; feedback: AnswerResult }
  | { type: 'hint'; blockId: string }
  | { type: 'retry'; blockId: string }
  | { type: 'next' }
  | { type: 'complete'; result: LessonResult }
