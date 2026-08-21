import type { LessonBlock, LessonSession } from '../../types/course'
import type { RunnerAction, RunnerState } from './types'

export const MAX_ATTEMPTS = 3

export const textValue = (content: Record<string, unknown>, key: string) =>
  typeof content[key] === 'string' ? content[key] : ''

export const stringList = (content: Record<string, unknown>, key: string) =>
  Array.isArray(content[key])
    ? content[key].filter((value): value is string => typeof value === 'string')
    : []

export function hasAnswer(answer: unknown, block: LessonBlock) {
  if (typeof answer === 'string') return answer.trim().length > 0
  if (Array.isArray(answer)) {
    if (block.type === 'quiz') {
      const questions = Array.isArray(block.content.questions) ? block.content.questions.length : 0
      return questions > 0 && answer.length >= questions && answer.every(Boolean)
    }
    return answer.length > 0
  }
  return Boolean(answer && typeof answer === 'object' && Object.keys(answer).length > 0)
}

function totals(feedback: RunnerState['feedback']) {
  return Object.values(feedback).reduce(
    (total, entry) => ({
      score: total.score + entry.score,
      possibleScore: total.possibleScore + entry.maxScore,
    }),
    { score: 0, possibleScore: 0 },
  )
}

export function createInitialRunnerState(
  blocks: LessonBlock[],
  session: LessonSession | null,
): RunnerState {
  const savedIndex = blocks.findIndex((block) => block.id === session?.currentBlockId)
  return {
    currentIndex: savedIndex >= 0 ? savedIndex : 0,
    answers: session?.draftAnswers ?? {},
    attempts: session?.attempts ?? {},
    feedback: session?.feedback ?? {},
    usedHints: session?.usedHints ?? [],
    score: session?.score ?? 0,
    possibleScore: session?.possibleScore ?? 0,
    result: null,
  }
}

export function lessonRunnerReducer(state: RunnerState, action: RunnerAction): RunnerState {
  if (action.type === 'answer') {
    const feedback = { ...state.feedback }
    delete feedback[action.blockId]
    return {
      ...state,
      answers: { ...state.answers, [action.blockId]: action.answer },
      feedback,
      ...totals(feedback),
    }
  }
  if (action.type === 'feedback') {
    const feedback = { ...state.feedback, [action.blockId]: action.feedback }
    return {
      ...state,
      feedback,
      attempts: { ...state.attempts, [action.blockId]: action.feedback.attemptNumber },
      ...totals(feedback),
    }
  }
  if (action.type === 'hint') {
    return state.usedHints.includes(action.blockId)
      ? state
      : { ...state, usedHints: [...state.usedHints, action.blockId] }
  }
  if (action.type === 'retry') {
    const feedback = { ...state.feedback }
    delete feedback[action.blockId]
    return { ...state, feedback, ...totals(feedback) }
  }
  if (action.type === 'next') return { ...state, currentIndex: state.currentIndex + 1 }
  return { ...state, result: action.result }
}
