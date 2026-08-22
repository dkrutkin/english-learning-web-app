import type { z } from 'zod'
import type {
  courseProgressStatusSchema,
  learningProgressStatusSchema,
  lessonBlockRowSchema,
  lessonBlockTypeSchema,
  lessonProgressRowSchema,
  lessonResultSchema,
  lessonRowSchema,
  lessonSessionRowSchema,
  levelProgressRowSchema,
  levelRowSchema,
  moduleProgressRowSchema,
  moduleRowSchema,
  progressSummarySchema,
  answerResultSchema,
} from '../schemas/course'

export type CourseProgressStatus = z.infer<typeof courseProgressStatusSchema>
export type LearningProgressStatus = z.infer<typeof learningProgressStatusSchema>
export type LessonBlockType = z.infer<typeof lessonBlockTypeSchema>
export type CourseLevel = z.infer<typeof levelRowSchema>
export type CourseModule = z.infer<typeof moduleRowSchema>
export type CourseLesson = z.infer<typeof lessonRowSchema>
export type LessonBlock = z.infer<typeof lessonBlockRowSchema>
export type LevelProgress = z.infer<typeof levelProgressRowSchema>
export type ModuleProgress = z.infer<typeof moduleProgressRowSchema>
export type LessonProgress = z.infer<typeof lessonProgressRowSchema>
export type LessonSession = z.infer<typeof lessonSessionRowSchema>
export type AnswerResult = z.infer<typeof answerResultSchema>
export type LessonResult = z.infer<typeof lessonResultSchema>
export type ProgressSummary = z.infer<typeof progressSummarySchema>
export type LessonAnswer = string | string[] | Record<string, string>

export type CourseProgress = {
  levels: LevelProgress[]
  modules: ModuleProgress[]
  lessons: LessonProgress[]
}

export type LevelWithProgress = CourseLevel & {
  progress: LevelProgress
}

export type ModuleWithProgress = CourseModule & {
  progress: ModuleProgress
}

export type LessonWithProgress = CourseLesson & {
  progress: LessonProgress
}

export type RecommendedLesson = {
  level: CourseLevel
  module: CourseModule
  lesson: CourseLesson
  progress: LessonProgress
}

export type CourseDataContext = {
  userId: string
  isMock: boolean
}
