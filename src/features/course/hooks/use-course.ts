import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../auth/AuthProvider'
import {
  getCourseLesson,
  getCourseLevel,
  getCourseLevels,
  getCourseModule,
  getLessonBlocks,
  getLevelModules,
  getModuleLessons,
  getRecommendedLesson,
} from '../api/course-api'
import { getProgressSummary } from '../api/progress-summary-api'
import { courseKeys } from './query-keys'

const courseQueryOptions = { staleTime: 5 * 60_000, gcTime: 30 * 60_000 }

function useCourseContext() {
  const { isMock, user } = useAuth()
  return {
    context: { userId: user?.id ?? '', isMock },
    isAuthenticated: Boolean(user),
    source: isMock ? ('mock' as const) : ('remote' as const),
  }
}

export function useCourseLevels() {
  const { context, isAuthenticated, source } = useCourseContext()
  return useQuery({
    queryKey: courseKeys.levels(source),
    queryFn: () => getCourseLevels(context),
    enabled: isAuthenticated,
    ...courseQueryOptions,
  })
}

export function useCourseLevel(levelSlug: string) {
  const { context, isAuthenticated, source } = useCourseContext()
  return useQuery({
    queryKey: courseKeys.level(source, levelSlug),
    queryFn: () => getCourseLevel(context, levelSlug),
    enabled: isAuthenticated && Boolean(levelSlug),
    ...courseQueryOptions,
  })
}

export function useLevelModules(levelSlug: string) {
  const { context, isAuthenticated, source } = useCourseContext()
  return useQuery({
    queryKey: courseKeys.modules(source, levelSlug),
    queryFn: () => getLevelModules(context, levelSlug),
    enabled: isAuthenticated && Boolean(levelSlug),
    ...courseQueryOptions,
  })
}

export function useCourseModule(levelSlug: string, moduleSlug: string) {
  const { context, isAuthenticated, source } = useCourseContext()
  return useQuery({
    queryKey: courseKeys.module(source, levelSlug, moduleSlug),
    queryFn: () => getCourseModule(context, levelSlug, moduleSlug),
    enabled: isAuthenticated && Boolean(levelSlug && moduleSlug),
    ...courseQueryOptions,
  })
}

export function useModuleLessons(levelSlug: string, moduleSlug: string) {
  const { context, isAuthenticated, source } = useCourseContext()
  return useQuery({
    queryKey: courseKeys.lessons(source, levelSlug, moduleSlug),
    queryFn: () => getModuleLessons(context, levelSlug, moduleSlug),
    enabled: isAuthenticated && Boolean(levelSlug && moduleSlug),
    ...courseQueryOptions,
  })
}

export function useCourseLesson(levelSlug: string, moduleSlug: string, lessonSlug: string) {
  const { context, isAuthenticated, source } = useCourseContext()
  return useQuery({
    queryKey: courseKeys.lesson(source, levelSlug, moduleSlug, lessonSlug),
    queryFn: () => getCourseLesson(context, levelSlug, moduleSlug, lessonSlug),
    enabled: isAuthenticated && Boolean(levelSlug && moduleSlug && lessonSlug),
    ...courseQueryOptions,
  })
}

export function useLessonBlocks(levelSlug: string, moduleSlug: string, lessonSlug: string) {
  const { context, isAuthenticated, source } = useCourseContext()
  return useQuery({
    queryKey: courseKeys.blocks(source, levelSlug, moduleSlug, lessonSlug),
    queryFn: () => getLessonBlocks(context, levelSlug, moduleSlug, lessonSlug),
    enabled: isAuthenticated && Boolean(levelSlug && moduleSlug && lessonSlug),
    ...courseQueryOptions,
  })
}

export function useCourseProgress() {
  const { context, isAuthenticated } = useCourseContext()
  return useQuery({
    queryKey: courseKeys.progressSummary(context.userId),
    queryFn: () => getProgressSummary(context),
    select: (summary) => summary.courseProgress,
    enabled: isAuthenticated,
    ...courseQueryOptions,
  })
}

export function useProgressSummary() {
  const { context, isAuthenticated } = useCourseContext()
  return useQuery({
    queryKey: courseKeys.progressSummary(context.userId),
    queryFn: () => getProgressSummary(context),
    enabled: isAuthenticated,
    ...courseQueryOptions,
  })
}

export function useRecommendedLesson() {
  const { context, isAuthenticated } = useCourseContext()
  return useQuery({
    queryKey: courseKeys.recommended(context.userId),
    queryFn: () => getRecommendedLesson(context),
    enabled: isAuthenticated,
    ...courseQueryOptions,
  })
}
