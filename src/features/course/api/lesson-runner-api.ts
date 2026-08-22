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
  mockLevels,
  mockModuleProgress,
  mockModules,
} from './mock-course'

const mockSessionKey = (userId: string, lessonId: string) =>
  `fluent-course-session:${userId}:${lessonId}`
export const pendingSessionKey = (userId: string, lessonId: string) =>
  `fluent-course-pending-session:${userId}:${lessonId}`
const mockAttemptsKey = (userId: string) => `fluent-course-attempts:${userId}`
const mockProgressKey = (userId: string) => `fluent-course-progress:${userId}`
type MockAttempt = AnswerResult & { answer: LessonAnswer }

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

function toSessionRow(session: LessonSession) {
  return {
    lesson_id: session.lessonId,
    current_block_id: session.currentBlockId,
    draft_answers: session.draftAnswers,
    attempts: session.attempts,
    feedback: session.feedback,
    used_hints: session.usedHints,
    score: session.score,
    possible_score: session.possibleScore,
    completion_percent: session.completionPercent,
    active_seconds: session.activeSeconds,
    started_at: session.startedAt,
    completed_at: session.completedAt,
    revision: session.revision,
    updated_at: session.updatedAt,
  }
}

export function readPendingLessonSession(userId: string, lessonId: string) {
  const pending = parseStored<LessonSession | null>(pendingSessionKey(userId, lessonId), null)
  if (!pending) return null
  try {
    return lessonSessionRowSchema.parse(toSessionRow(pending))
  } catch {
    window.localStorage.removeItem(pendingSessionKey(userId, lessonId))
    return null
  }
}

export function writePendingLessonSession(userId: string, session: LessonSession) {
  try {
    window.localStorage.setItem(
      pendingSessionKey(userId, session.lessonId),
      JSON.stringify(session),
    )
  } catch {
    // The network save can still proceed when browser storage is unavailable.
  }
}

export function clearPendingLessonSession(userId: string, lessonId: string) {
  try {
    window.localStorage.removeItem(pendingSessionKey(userId, lessonId))
  } catch {
    // Storage may be disabled by the browser.
  }
}

export function getMockCourseProgress(userId: string): CourseProgress {
  const overrides = parseStored<{
    levels?: Array<Record<string, unknown>>
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

  const levelRows = mockLevelProgress.map((entry) => ({ ...entry }))
  for (const override of overrides.levels ?? []) {
    const index = levelRows.findIndex((entry) => entry.level_id === override.level_id)
    if (index >= 0)
      levelRows[index] = { ...levelRows[index], ...override } as (typeof levelRows)[number]
    else levelRows.push(override as (typeof levelRows)[number])
  }

  return {
    levels: levelProgressResponseSchema.parse(levelRows),
    modules: moduleProgressResponseSchema.parse(moduleRows),
    lessons: lessonProgressResponseSchema.parse(lessonRows),
  }
}

export async function getLessonSession(
  context: CourseDataContext,
  lessonId: string,
): Promise<LessonSession | null> {
  const pending = readPendingLessonSession(context.userId, lessonId)
  if (context.isMock) {
    const stored = parseStored<unknown | null>(mockSessionKey(context.userId, lessonId), null)
    const serverSession = stored ? lessonSessionRowSchema.parse(stored) : null
    if (!pending) return serverSession
    if (!serverSession || pending.revision === serverSession.revision) return pending
    clearPendingLessonSession(context.userId, lessonId)
    return serverSession
  }

  const { data, error } = await requireSupabase()
    .from('user_lesson_sessions')
    .select(
      'lesson_id, current_block_id, draft_answers, attempts, feedback, used_hints, score, possible_score, completion_percent, active_seconds, started_at, completed_at, revision, updated_at',
    )
    .eq('user_id', context.userId)
    .eq('lesson_id', lessonId)
    .maybeSingle()
  if (error) {
    if (pending) return pending
    throw error
  }
  const serverSession = data ? lessonSessionRowSchema.parse(data) : null
  if (!pending) return serverSession
  if (!serverSession || pending.revision === serverSession.revision) return pending
  clearPendingLessonSession(context.userId, lessonId)
  return serverSession
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
    completion_percent: session.completionPercent,
    active_seconds: session.activeSeconds,
    started_at: session.startedAt,
    completed_at: session.completedAt,
    revision: session.revision,
    updated_at: new Date().toISOString(),
  }
  if (context.isMock) {
    const stored = parseStored<unknown | null>(mockSessionKey(context.userId, lessonId), null)
    const current = stored ? lessonSessionRowSchema.parse(stored) : null
    if ((current?.revision ?? 0) !== session.revision) {
      throw new Error('Session revision conflict')
    }
    const saved = { ...row, revision: session.revision + 1 }
    window.localStorage.setItem(mockSessionKey(context.userId, lessonId), JSON.stringify(saved))
    clearPendingLessonSession(context.userId, lessonId)
    return lessonSessionRowSchema.parse(saved)
  }

  const { data, error } = await requireSupabase().rpc('save_lesson_session', {
    p_lesson_id: lessonId,
    p_current_block_id: session.currentBlockId,
    p_draft_answers: session.draftAnswers as Json,
    p_attempts: session.attempts as Json,
    p_feedback: session.feedback as Json,
    p_used_hints: session.usedHints as Json,
    p_score: session.score,
    p_possible_score: session.possibleScore,
    p_completion_percent: session.completionPercent,
    p_active_seconds: session.activeSeconds,
    p_started_at: session.startedAt,
    p_completed_at: session.completedAt,
    p_expected_revision: session.revision,
  })
  if (error) throw error
  clearPendingLessonSession(context.userId, lessonId)
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
  const block = mockLessonBlocks.find((entry) => entry.id === blockId)
  if (block?.type === 'fill_gap' && typeof expected === 'string' && typeof answer === 'string') {
    const isCorrect = expected.trim().toLocaleLowerCase() === answer.trim().toLocaleLowerCase()
    return {
      isCorrect,
      score: isCorrect ? (usedHint ? 0.8 : 1) : 0,
      maxScore: 1,
      attemptNumber,
      usedHint,
    }
  }
  if (Array.isArray(expected) && Array.isArray(answer)) {
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
    const attempts = parseStored<Record<string, MockAttempt[]>>(mockAttemptsKey(context.userId), {})
    const result = gradeMockAnswer(blockId, answer, (attempts[blockId]?.length ?? 0) + 1, usedHint)
    attempts[blockId] = [...(attempts[blockId] ?? []), { ...result, answer }]
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
  const attempts = parseStored<Record<string, MockAttempt[]>>(mockAttemptsKey(context.userId), {})
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
    levels?: Array<Record<string, unknown>>
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
  const lessonKind =
    lesson.slug === 'level-assessment'
      ? 'level_assessment'
      : lesson.slug === 'module-review'
        ? 'module_assessment'
        : 'lesson'
  const previousModuleProgress = [...mockModuleProgress, ...(existing.modules ?? [])].find(
    (entry) => entry.module_id === lesson.module_id,
  )
  const moduleAssessmentScore =
    lessonKind === 'module_assessment'
      ? accuracyPercent
      : typeof previousModuleProgress?.assessment_score === 'number'
        ? previousModuleProgress.assessment_score
        : null
  const moduleMastered = moduleCompleted && (moduleAssessmentScore ?? 0) >= 85
  const modules = [...(existing.modules ?? [])].filter(
    (entry) => entry.module_id !== lesson.module_id,
  )
  modules.push({
    module_id: lesson.module_id,
    completion_percent: moduleCompletionPercent,
    average_accuracy: accuracyPercent,
    assessment_score: moduleAssessmentScore,
    status: moduleMastered ? 'mastered' : moduleCompleted ? 'completed' : 'in_progress',
  })

  const module = mockModules.find((entry) => entry.id === lesson.module_id)!
  const nextLesson = mockLessons
    .filter(
      (entry) => entry.module_id === lesson.module_id && entry.order_index > lesson.order_index,
    )
    .sort((left, right) => left.order_index - right.order_index)[0]
  const nextModule = mockModules
    .filter((entry) => entry.level_id === module.level_id && entry.order_index > module.order_index)
    .sort((left, right) => left.order_index - right.order_index)[0]

  if (moduleCompleted && nextModule) {
    const existingNext = modules.find((entry) => entry.module_id === nextModule.id)
    if (!existingNext) {
      modules.push({
        module_id: nextModule.id,
        completion_percent: 0,
        average_accuracy: null,
        assessment_score: null,
        status: 'available',
      })
    }
  }

  const levelModules = mockModules.filter(
    (entry) => entry.level_id === module.level_id && entry.is_required,
  )
  const progressByModule = new Map([
    ...mockModuleProgress.map((entry) => [entry.module_id, entry] as const),
    ...modules.map((entry) => [String(entry.module_id), entry] as const),
  ])
  const completedModules = levelModules.filter((entry) => {
    const status = progressByModule.get(entry.id)?.status
    return status === 'completed' || status === 'mastered'
  })
  const levelCompletionPercent = Math.round((completedModules.length / levelModules.length) * 100)
  const levelAssessmentLesson = mockLessons.find(
    (entry) =>
      entry.slug === 'level-assessment' &&
      levelModules.some((levelModule) => levelModule.id === entry.module_id),
  )
  const levelCompleted =
    levelModules.length > 0 &&
    completedModules.length === levelModules.length &&
    Boolean(levelAssessmentLesson && baseCompleted.has(levelAssessmentLesson.id))
  const moduleAssessmentScores = levelModules
    .map((entry) => progressByModule.get(entry.id)?.assessment_score)
    .filter((score): score is number => typeof score === 'number')
  const previousLevelProgress = [...mockLevelProgress, ...(existing.levels ?? [])].find(
    (entry) => entry.level_id === module.level_id,
  )
  const levelAssessmentScore =
    lessonKind === 'level_assessment'
      ? accuracyPercent
      : typeof previousLevelProgress?.assessment_score === 'number'
        ? previousLevelProgress.assessment_score
        : moduleAssessmentScores.length
          ? Math.round(
              moduleAssessmentScores.reduce((total, score) => total + score, 0) /
                moduleAssessmentScores.length,
            )
          : null
  const levelMastered = levelCompleted && (levelAssessmentScore ?? 0) >= 85
  const levels = [...(existing.levels ?? [])].filter((entry) => entry.level_id !== module.level_id)
  levels.push({
    level_id: module.level_id,
    completion_percent: levelCompletionPercent,
    average_accuracy: accuracyPercent,
    assessment_score: levelAssessmentScore,
    status: levelMastered ? 'mastered' : levelCompleted ? 'completed' : 'in_progress',
  })
  const level = mockLevels.find((entry) => entry.id === module.level_id)!
  const nextLevel = mockLevels
    .filter((entry) => entry.order_index > level.order_index)
    .sort((left, right) => left.order_index - right.order_index)[0]
  if (levelCompleted && nextLevel && !levels.some((entry) => entry.level_id === nextLevel.id)) {
    levels.push({
      level_id: nextLevel.id,
      completion_percent: 0,
      average_accuracy: null,
      assessment_score: null,
      status: 'available',
    })
  }
  window.localStorage.setItem(
    mockProgressKey(context.userId),
    JSON.stringify({ levels, lessons, modules }),
  )

  const review = gradedBlocks.map((block, index) => {
    const result = bestAttempts[index]
    const blockType: string = block.type
    const skill =
      blockType === 'fill_gap' || blockType === 'sentence_builder'
        ? 'grammar'
        : blockType === 'reading_question'
          ? 'reading'
          : blockType === 'listening_question'
            ? 'listening'
            : blockType === 'quiz'
              ? 'mixed'
              : 'vocabulary'
    return {
      blockId: block.id,
      title: block.title ?? 'Exercise',
      skill,
      isCorrect: result.isCorrect,
      score: result.score,
      maxScore: result.maxScore,
      userAnswer: result.answer,
      correctAnswer: mockAnswerKeys[block.id],
    }
  })
  const skillGroups = new Map<string, { score: number; maxScore: number }>()
  review.forEach((item) => {
    const current = skillGroups.get(item.skill) ?? { score: 0, maxScore: 0 }
    skillGroups.set(item.skill, {
      score: current.score + item.score,
      maxScore: current.maxScore + item.maxScore,
    })
  })

  return lessonResultSchema.parse({
    lessonCompleted: true,
    lessonKind,
    score: earned,
    possibleScore: possible,
    moduleCompleted,
    moduleMastered,
    moduleCompletionPercent,
    moduleAssessmentScore,
    moduleStatus: moduleMastered ? 'mastered' : moduleCompleted ? 'completed' : 'in_progress',
    moduleSealAwarded: moduleCompleted,
    levelCompleted,
    levelMastered,
    levelCompletionPercent,
    levelAssessmentScore,
    levelStatus: levelMastered ? 'mastered' : levelCompleted ? 'completed' : 'in_progress',
    levelEmblemAwarded: levelCompleted,
    accuracyPercent,
    skillBreakdown: [...skillGroups.entries()].map(([skill, totals]) => ({
      skill,
      ...totals,
      accuracyPercent:
        totals.maxScore > 0 ? Math.round((totals.score / totals.maxScore) * 100) : 100,
    })),
    answerReview: review,
    nextLesson: nextLesson ? { slug: nextLesson.slug, title: nextLesson.title } : null,
    nextModule:
      moduleCompleted && nextModule ? { slug: nextModule.slug, title: nextModule.title } : null,
    nextLevel:
      levelCompleted && nextLevel ? { slug: nextLevel.slug, title: nextLevel.title } : null,
    unlockedAchievements: levelCompleted
      ? ['first-step', 'first-module', 'level-complete']
      : moduleCompleted
        ? ['first-step', 'first-module']
        : ['first-step'],
  })
}
