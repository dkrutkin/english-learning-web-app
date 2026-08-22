import { supabase } from '../../../lib/supabase/client'
import {
  lessonBlocksResponseSchema,
  lessonRowSchema,
  lessonsResponseSchema,
  levelRowSchema,
  levelsResponseSchema,
  moduleRowSchema,
  modulesResponseSchema,
} from '../schemas/course'
import type {
  CourseDataContext,
  CourseLesson,
  CourseLevel,
  CourseModule,
  CourseProgress,
  LessonBlock,
  RecommendedLesson,
} from '../types/course'
import { findRecommendedLesson } from '../utils/course'
import { mockLessonBlocks, mockLessons, mockLevels, mockModules } from './mock-course'
import { getProgressSummary } from './progress-summary-api'

const levelColumns =
  'id, slug, cefr, title, description, order_index, illustration_url, status' as const
const moduleColumns =
  'id, level_id, slug, title, description, learning_outcome, illustration_url, icon, order_index, estimated_minutes, is_required, status' as const
const lessonColumns =
  'id, module_id, slug, title, description, order_index, estimated_minutes, is_required, status, version' as const
const blockColumns =
  'id, lesson_id, type, title, content, order_index, is_required, is_graded' as const

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured for course data.')
  return supabase
}

function raiseQueryError(error: { message: string } | null, resource: string) {
  if (error) throw new Error(`Could not load ${resource}: ${error.message}`)
}

export async function getCourseLevels(context: CourseDataContext): Promise<CourseLevel[]> {
  if (context.isMock) return levelsResponseSchema.parse(mockLevels)

  const { data, error } = await requireSupabase()
    .from('levels')
    .select(levelColumns)
    .eq('status', 'published')
    .order('order_index')
  raiseQueryError(error, 'course levels')
  return levelsResponseSchema.parse(data ?? [])
}

export async function getCourseLevel(
  context: CourseDataContext,
  levelSlug: string,
): Promise<CourseLevel | null> {
  if (context.isMock) {
    const row = mockLevels.find((level) => level.slug === levelSlug)
    return row ? levelRowSchema.parse(row) : null
  }

  const { data, error } = await requireSupabase()
    .from('levels')
    .select(levelColumns)
    .eq('slug', levelSlug)
    .eq('status', 'published')
    .maybeSingle()
  raiseQueryError(error, 'course level')
  return data ? levelRowSchema.parse(data) : null
}

export async function getLevelModules(
  context: CourseDataContext,
  levelSlug: string,
): Promise<CourseModule[]> {
  const level = await getCourseLevel(context, levelSlug)
  if (!level) return []
  if (context.isMock) {
    return modulesResponseSchema.parse(mockModules.filter((module) => module.level_id === level.id))
  }

  const { data, error } = await requireSupabase()
    .from('modules')
    .select(moduleColumns)
    .eq('level_id', level.id)
    .eq('status', 'published')
    .order('order_index')
  raiseQueryError(error, 'level modules')
  return modulesResponseSchema.parse(data ?? [])
}

export async function getCourseModule(
  context: CourseDataContext,
  levelSlug: string,
  moduleSlug: string,
): Promise<CourseModule | null> {
  const level = await getCourseLevel(context, levelSlug)
  if (!level) return null
  if (context.isMock) {
    const row = mockModules.find(
      (module) => module.level_id === level.id && module.slug === moduleSlug,
    )
    return row ? moduleRowSchema.parse(row) : null
  }

  const { data, error } = await requireSupabase()
    .from('modules')
    .select(moduleColumns)
    .eq('level_id', level.id)
    .eq('slug', moduleSlug)
    .eq('status', 'published')
    .maybeSingle()
  raiseQueryError(error, 'course module')
  return data ? moduleRowSchema.parse(data) : null
}

export async function getModuleLessons(
  context: CourseDataContext,
  levelSlug: string,
  moduleSlug: string,
): Promise<CourseLesson[]> {
  const module = await getCourseModule(context, levelSlug, moduleSlug)
  if (!module) return []
  if (context.isMock) {
    return lessonsResponseSchema.parse(
      mockLessons.filter((lesson) => lesson.module_id === module.id),
    )
  }

  const { data, error } = await requireSupabase()
    .from('lessons')
    .select(lessonColumns)
    .eq('module_id', module.id)
    .eq('status', 'published')
    .order('order_index')
  raiseQueryError(error, 'module lessons')
  return lessonsResponseSchema.parse(data ?? [])
}

export async function getCourseLesson(
  context: CourseDataContext,
  levelSlug: string,
  moduleSlug: string,
  lessonSlug: string,
): Promise<CourseLesson | null> {
  const module = await getCourseModule(context, levelSlug, moduleSlug)
  if (!module) return null
  if (context.isMock) {
    const row = mockLessons.find(
      (lesson) => lesson.module_id === module.id && lesson.slug === lessonSlug,
    )
    return row ? lessonRowSchema.parse(row) : null
  }

  const { data, error } = await requireSupabase()
    .from('lessons')
    .select(lessonColumns)
    .eq('module_id', module.id)
    .eq('slug', lessonSlug)
    .eq('status', 'published')
    .maybeSingle()
  raiseQueryError(error, 'course lesson')
  return data ? lessonRowSchema.parse(data) : null
}

export async function getLessonBlocks(
  context: CourseDataContext,
  levelSlug: string,
  moduleSlug: string,
  lessonSlug: string,
): Promise<LessonBlock[]> {
  const lesson = await getCourseLesson(context, levelSlug, moduleSlug, lessonSlug)
  if (!lesson) return []
  if (context.isMock) {
    return lessonBlocksResponseSchema.parse(
      mockLessonBlocks.filter((block) => block.lesson_id === lesson.id),
    )
  }

  const { data, error } = await requireSupabase()
    .from('lesson_blocks')
    .select(blockColumns)
    .eq('lesson_id', lesson.id)
    .order('order_index')
  raiseQueryError(error, 'lesson blocks')
  return lessonBlocksResponseSchema.parse(data ?? [])
}

export async function getUserCourseProgress(context: CourseDataContext): Promise<CourseProgress> {
  return (await getProgressSummary(context)).courseProgress
}

async function getPublishedCourse(context: CourseDataContext) {
  const levels = await getCourseLevels(context)
  if (context.isMock) {
    return {
      levels,
      modules: modulesResponseSchema.parse(mockModules),
      lessons: lessonsResponseSchema.parse(mockLessons),
    }
  }
  if (levels.length === 0) return { levels, modules: [], lessons: [] }

  const client = requireSupabase()
  const moduleResult = await client
    .from('modules')
    .select(moduleColumns)
    .in(
      'level_id',
      levels.map((level) => level.id),
    )
    .eq('status', 'published')
    .order('order_index')
  raiseQueryError(moduleResult.error, 'published modules')
  const modules = modulesResponseSchema.parse(moduleResult.data ?? [])
  if (modules.length === 0) return { levels, modules, lessons: [] }

  const lessonResult = await client
    .from('lessons')
    .select(lessonColumns)
    .in(
      'module_id',
      modules.map((module) => module.id),
    )
    .eq('status', 'published')
    .order('order_index')
  raiseQueryError(lessonResult.error, 'published lessons')
  return { levels, modules, lessons: lessonsResponseSchema.parse(lessonResult.data ?? []) }
}

export async function getRecommendedLesson(
  context: CourseDataContext,
): Promise<RecommendedLesson | null> {
  const [{ levels, modules, lessons }, progress] = await Promise.all([
    getPublishedCourse(context),
    getUserCourseProgress(context),
  ])
  return findRecommendedLesson(levels, modules, lessons, progress)
}
