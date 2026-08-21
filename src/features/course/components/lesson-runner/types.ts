import type { AnswerResult, LessonAnswer, LessonResult } from '../../types/course'

export type RunnerState = {
  currentIndex: number
  answers: Record<string, unknown>
  attempts: Record<string, number>
  feedback: Record<string, AnswerResult>
  usedHints: string[]
  score: number
  possibleScore: number
  activeSeconds: number
  startedAt: string
  completedAt: string | null
  revision: number
  result: LessonResult | null
}

export type RunnerAction =
  | { type: 'answer'; blockId: string; answer: LessonAnswer }
  | { type: 'feedback'; blockId: string; feedback: AnswerResult }
  | { type: 'hint'; blockId: string }
  | { type: 'retry'; blockId: string }
  | { type: 'next' }
  | { type: 'activity'; seconds: number }
  | { type: 'complete'; result: LessonResult }
