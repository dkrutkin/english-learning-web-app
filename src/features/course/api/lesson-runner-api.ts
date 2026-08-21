import { supabase } from '../../../lib/supabase/client'
import type { Json } from '../../../lib/supabase/database.types'
import {
  answerResultSchema,
  lessonProgressResponseSchema,
  lessonResultSchema,
  lessonSessionRowSchema,
  levelProgressResponseSchema,
  moduleProgressResponseSchema,
} from '../schemas/course'
import type {
  AnswerResult,
  CourseDataContext,
  CourseProgress,
  LessonAnswer,
  LessonResult,
  LessonSession,
} from '../types/course'
import {
  mockAnswerKeys,
  mockLessonBlocks,
  mockLessonProgress,
  mockLessons,
  mockLevelProgress,
  mockModuleProgress,
} from './mock-course'

const mockSessionKey = (userId: string, lessonId: string) =>
  `fluent-course-session:${userId}:${lessonId}`
const mockAttemptsKey = (userId: string) => `fluent-course-attempts:${userId}`
const mockProgressKey = (userId: string) => `fluent-course-progress:${userId}`

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured for lesson progress.')
  return supabase
}

function parseStored<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key)
    return value ? (JSON.parse(value) as T) : fallback
  } catch {
    return fallback
  }
}

export function getMockCourseProgress(userId: string): CourseProgress {
  const overrides = parseStored<{
    lessons?: Array<Record<string, unknown>>
    modules?: Array<Record<string, unknown>>
  }>(mockProgressKey(userId), {})

  const lessonRows = mockLessonProgress.map((entry) => ({ ...entry }))
  for (const override of overrides.lessons ?? []) {
    const index = lessonRows.findIndex((entry) => entry.lesson_id === override.lesson_id)
    if (index >= 0)
      lessonRows[index] = { ...lessonRows[index], ...override } as (typeof lessonRows)[number]
    else lessonRows.push(override as (typeof lessonRows)[number])
  }
  const moduleRows = mockModuleProgress.map((entry) => ({ ...entry }))
  for (const override of overrides.modules ?? []) {
    const index = moduleRows.findIndex((entry) => entry.module_id === override.module_id)
    if (index >= 0)
      moduleRows[index] = { ...moduleRows[index], ...override } as (typeof moduleRows)[number]
    else moduleRows.push(override as (typeof moduleRows)[number])
  }

  return {
    levels: levelProgressResponseSchema.parse(mockLevelProgress),
    modules: moduleProgressResponseSchema.parse(moduleRows),
    lessons: lessonProgressResponseSchema.parse(lessonRows),
  }
}

export async function getLessonSession(
  context: CourseDataContext,
  lessonId: string,
): Promise<LessonSession | null> {
  if (context.isMock) {
    const stored = parseStored<unknown | null>(mockSessionKey(context.userId, lessonId), null)
    return stored ? lessonSessionRowSchema.parse(stored) : null
  }

  const { data, error } = await requireSupabase()
    .from('user_lesson_sessions')
    .select(
      'lesson_id, current_block_id, draft_answers, attempts, feedback, used_hints, score, possible_score, updated_at',
    )
    .eq('user_id', context.userId)
    .eq('lesson_id', lessonId)
    .maybeSingle()
  if (error) throw error
  return data ? lessonSessionRowSchema.parse(data) : null
}

export async function saveLessonSession(
  context: CourseDataContext,
  lessonId: string,
  session: Omit<LessonSession, 'lessonId' | 'updatedAt'>,
): Promise<LessonSession> {
  const row = {
    lesson_id: lessonId,
    current_block_id: session.currentBlockId,
    draft_answers: session.draftAnswers,
    attempts: session.attempts,
    feedback: session.feedback,
    used_hints: session.usedHints,
    score: session.score,
    possible_score: session.possibleScore,
    updated_at: new Date().toISOString(),
  }
  if (context.isMock) {
    window.localStorage.setItem(mockSessionKey(context.userId, lessonId), JSON.stringify(row))
    return lessonSessionRowSchema.parse(row)
  }

  const { data, error } = await requireSupabase()
    .from('user_lesson_sessions')
    .upsert(
      {
        user_id: context.userId,
        ...row,
        draft_answers: row.draft_answers as Json,
        attempts: row.attempts as Json,
        feedback: row.feedback as Json,
        used_hints: row.used_hints as Json,
      },
      { onConflict: 'user_id,lesson_id' },
    )
    .select(
      'lesson_id, current_block_id, draft_answers, attempts, feedback, used_hints, score, possible_score, updated_at',
    )
    .single()
  if (error) throw error
  return lessonSessionRowSchema.parse(data)
}

function gradeMockAnswer(
  blockId: string,
  answer: LessonAnswer,
  attemptNumber: number,
  usedHint: boolean,
): AnswerResult {
  const expected = mockAnswerKeys[blockId]
  if (expected === undefined) throw new Error('Mock answer key is missing.')
  if (Array.isArray(expected) && Array.isArray(answer)) {
    const block = mockLessonBlocks.find((entry) => entry.id === blockId)
    const matching = expected.filter((value, index) =>
      block?.type === 'multiple_choice' ? answer.includes(value) : value === answer[index],
    ).length
    const score =
      block?.type === 'multiple_choice'
        ? Math.max(0, matching - Math.max(0, answer.length - expected.length))
        : matching
    const isCorrect = score === expected.length
    return {
      isCorrect,
      score: usedHint && score > 0 ? Number((score * 0.8).toFixed(2)) : score,
      maxScore: expected.length,
      attemptNumber,
      usedHint,
    }
  }
  const isCorrect = expected === answer
  return {
    isCorrect,
    score: isCorrect ? (usedHint ? 0.8 : 1) : 0,
    maxScore: 1,
    attemptNumber,
    usedHint,
  }
}

export async function submitLessonAnswer(
  context: CourseDataContext,
  lessonId: string,
  blockId: string,
  answer: LessonAnswer,
  usedHint = false,
): Promise<AnswerResult> {
  if (context.isMock) {
    const attempts = parseStored<Record<string, AnswerResult[]>>(
      mockAttemptsKey(context.userId),
      {},
    )
    const result = gradeMockAnswer(blockId, answer, (attempts[blockId]?.length ?? 0) + 1, usedHint)
    attempts[blockId] = [...(attempts[blockId] ?? []), result]
    window.localStorage.setItem(mockAttemptsKey(context.userId), JSON.stringify(attempts))
    return result
  }

  const { data, error } = await requireSupabase().rpc('submit_lesson_answer', {
    p_lesson_id: lessonId,
    p_block_id: blockId,
    p_answer: answer as Json,
    p_used_hint: usedHint,
  })
  if (error) throw error
  return answerResultSchema.parse(data)
}

export async function completeLesson(
  context: CourseDataContext,
  lessonId: string,
): Promise<LessonResult> {
  if (!context.isMock) {
    const { data, error } = await requireSupabase().rpc('complete_lesson', {
      p_lesson_id: lessonId,
    })
    if (error) throw error
    return lessonResultSchema.parse(data)
  }

  const lesson = mockLessons.find((entry) => entry.id === lessonId)
  if (!lesson) throw new Error('Mock lesson not found.')
  const gradedBlocks = mockLessonBlocks.filter(
    (block) => block.lesson_id === lessonId && block.is_required && block.is_graded,
  )
  const attempts = parseStored<Record<string, AnswerResult[]>>(mockAttemptsKey(context.userId), {})
  if (gradedBlocks.some((block) => !attempts[block.id]?.length)) {
    throw new Error('Complete all required exercises first.')
  }
  const bestAttempts = gradedBlocks.map((block) =>
    attempts[block.id].reduce((best, current) => (current.score > best.score ? current : best)),
  )
  const earned = bestAttempts.reduce((total, attempt) => total + attempt.score, 0)
  const possible = bestAttempts.reduce((total, attempt) => total + attempt.maxScore, 0)
  const accuracyPercent = possible > 0 ? Math.round((earned / possible) * 100) : 100
  const existing = parseStored<{
    lessons?: Array<Record<string, unknown>>
    modules?: Array<Record<string, unknown>>
  }>(mockProgressKey(context.userId), {})
  const lessons = [...(existing.lessons ?? [])].filter((entry) => entry.lesson_id !== lessonId)
  lessons.push({
    lesson_id: lessonId,
    completion_percent: 100,
    accuracy_percent: accuracyPercent,
    status: 'completed',
    last_activity_at: new Date().toISOString(),
  })

  const moduleLessons = mockLessons.filter(
    (entry) => entry.module_id === lesson.module_id && entry.is_required,
  )
  const baseCompleted = new Set<string>(
    mockLessonProgress
      .filter((entry) => entry.status === 'completed')
      .map((entry) => entry.lesson_id),
  )
  lessons.forEach((entry) => {
    if (entry.status === 'completed' && typeof entry.lesson_id === 'string') {
      baseCompleted.add(entry.lesson_id)
    }
  })
  const completedCount = moduleLessons.filter((entry) => baseCompleted.has(entry.id)).length
  const moduleCompletionPercent = Math.round((completedCount / moduleLessons.length) * 100)
  const moduleCompleted = moduleCompletionPercent === 100
  const modules = [...(existing.modules ?? [])].filter(
    (entry) => entry.module_id !== lesson.module_id,
  )
  modules.push({
    module_id: lesson.module_id,
    completion_percent: moduleCompletionPercent,
    average_accuracy: accuracyPercent,
    assessment_score: null,
    status: moduleCompleted ? 'completed' : 'in_progress',
  })
  window.localStorage.setItem(mockProgressKey(context.userId), JSON.stringify({ lessons, modules }))

  return lessonResultSchema.parse({
    lessonCompleted: true,
    moduleCompleted,
    moduleCompletionPercent,
    accuracyPercent,
    unlockedAchievements: moduleCompleted ? ['first-step', 'first-module'] : ['first-step'],
  })
}
