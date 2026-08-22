import type {
  CourseLesson,
  CourseLevel,
  CourseModule,
  CourseProgress,
  CourseProgressStatus,
  LearningProgressStatus,
  LessonProgress,
  LevelWithProgress,
  ModuleWithProgress,
  RecommendedLesson,
} from '../types/course'

export const emptyCourseProgress: CourseProgress = { levels: [], modules: [], lessons: [] }

const defaultLevelProgress = (entityId: string, status: CourseProgressStatus) => ({
  entityId,
  completionPercent: 0,
  averageAccuracy: null,
  assessmentScore: null,
  status,
})

const defaultModuleProgress = (entityId: string, status: CourseProgressStatus) => ({
  entityId,
  completionPercent: 0,
  averageAccuracy: null,
  assessmentScore: null,
  status,
})

export const defaultLessonProgress = (entityId: string): LessonProgress => ({
  entityId,
  completionPercent: 0,
  accuracyPercent: null,
  status: 'not_started',
  lastActivityAt: null,
})

export function mergeLevelsWithProgress(
  levels: CourseLevel[],
  progress: CourseProgress,
): LevelWithProgress[] {
  return levels.map((level, index) => ({
    ...level,
    progress:
      level.status !== 'published'
        ? defaultLevelProgress(level.id, 'locked')
        : (progress.levels.find((entry) => entry.entityId === level.id) ??
          defaultLevelProgress(level.id, index === 0 ? 'available' : 'locked')),
  }))
}

export function mergeModulesWithProgress(
  modules: CourseModule[],
  progress: CourseProgress,
): ModuleWithProgress[] {
  return modules.map((module, index) => ({
    ...module,
    progress:
      progress.modules.find((entry) => entry.entityId === module.id) ??
      defaultModuleProgress(module.id, index === 0 ? 'available' : 'locked'),
  }))
}

export const progressLabels: Record<CourseProgressStatus | LearningProgressStatus, string> = {
  locked: 'Locked',
  available: 'Available',
  not_started: 'Not started',
  in_progress: 'In progress',
  completed: 'Completed',
  mastered: 'Mastered',
}

export const formatMinutes = (minutes: number) => {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`
}

export function findRecommendedLesson(
  levels: CourseLevel[],
  modules: CourseModule[],
  lessons: CourseLesson[],
  progress: CourseProgress,
): RecommendedLesson | null {
  const levelById = new Map(levels.map((level) => [level.id, level]))
  const moduleById = new Map(modules.map((module) => [module.id, module]))
  const lessonProgressById = new Map(progress.lessons.map((entry) => [entry.entityId, entry]))
  const moduleProgressById = new Map(progress.modules.map((entry) => [entry.entityId, entry]))

  const orderedLessons = [...lessons].sort((left, right) => {
    const leftModule = moduleById.get(left.moduleId)
    const rightModule = moduleById.get(right.moduleId)
    const leftLevel = leftModule ? levelById.get(leftModule.levelId) : undefined
    const rightLevel = rightModule ? levelById.get(rightModule.levelId) : undefined
    return (
      (leftLevel?.orderIndex ?? 0) - (rightLevel?.orderIndex ?? 0) ||
      (leftModule?.orderIndex ?? 0) - (rightModule?.orderIndex ?? 0) ||
      left.orderIndex - right.orderIndex
    )
  })

  const inProgress = orderedLessons
    .filter((lesson) => lessonProgressById.get(lesson.id)?.status === 'in_progress')
    .sort((left, right) => {
      const leftDate = lessonProgressById.get(left.id)?.lastActivityAt ?? ''
      const rightDate = lessonProgressById.get(right.id)?.lastActivityAt ?? ''
      return rightDate.localeCompare(leftDate)
    })[0]

  const lesson =
    inProgress ??
    orderedLessons.find((candidate) => {
      const module = moduleById.get(candidate.moduleId)
      if (!module || moduleProgressById.get(module.id)?.status === 'locked') return false
      return lessonProgressById.get(candidate.id)?.status !== 'completed'
    })
  if (!lesson) return null

  const module = moduleById.get(lesson.moduleId)
  const level = module ? levelById.get(module.levelId) : undefined
  if (!module || !level) return null

  return {
    level,
    module,
    lesson,
    progress: lessonProgressById.get(lesson.id) ?? defaultLessonProgress(lesson.id),
  }
}
