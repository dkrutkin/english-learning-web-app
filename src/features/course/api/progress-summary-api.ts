import { supabase } from '../../../lib/supabase/client'
import { progressSummarySchema } from '../schemas/course'
import type { CourseDataContext, ProgressSummary } from '../types/course'
import { mockLessonBlocks, mockLessons, mockLevels, mockModules } from './mock-course'
import { getMockCourseProgress } from './lesson-runner-api'

type StoredAttempt = { score: number; maxScore: number }

const skillCatalog = [
  ['vocabulary', 'Vocabulary'],
  ['grammar', 'Grammar'],
  ['reading', 'Reading'],
  ['listening', 'Listening'],
  ['writing', 'Writing'],
  ['speaking', 'Speaking'],
  ['mixed', 'Mixed'],
] as const

function blockSkill(type: string) {
  if (type === 'fill_gap' || type === 'sentence_builder') return 'grammar'
  if (type === 'reading_question') return 'reading'
  if (type === 'listening_question') return 'listening'
  if (type === 'writing_prompt') return 'writing'
  if (type === 'speaking_prompt') return 'speaking'
  if (type === 'quiz') return 'mixed'
  return 'vocabulary'
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function startOfWeek(date: Date) {
  const result = new Date(date)
  const day = result.getUTCDay()
  result.setUTCDate(result.getUTCDate() - (day === 0 ? 6 : day - 1))
  result.setUTCHours(0, 0, 0, 0)
  return result
}

function mockActivity(progress: ReturnType<typeof getMockCourseProgress>) {
  const byDate = new Map<string, { lessonsCompleted: number; minutesActive: number }>()
  progress.lessons.forEach((entry) => {
    if (!entry.lastActivityAt) return
    const date = entry.lastActivityAt.slice(0, 10)
    const current = byDate.get(date) ?? { lessonsCompleted: 0, minutesActive: 0 }
    const lesson = mockLessons.find((candidate) => candidate.id === entry.entityId)
    byDate.set(date, {
      lessonsCompleted: current.lessonsCompleted + (entry.status === 'completed' ? 1 : 0),
      minutesActive: current.minutesActive + (lesson?.estimated_minutes ?? 0),
    })
  })

  return Array.from({ length: 84 }, (_, index) => {
    const date = new Date()
    date.setUTCHours(0, 0, 0, 0)
    date.setUTCDate(date.getUTCDate() - (83 - index))
    const values = byDate.get(dateKey(date)) ?? { lessonsCompleted: 0, minutesActive: 0 }
    const intensity =
      values.minutesActive === 0
        ? 0
        : values.minutesActive <= 15
          ? 1
          : values.minutesActive <= 30
            ? 2
            : values.minutesActive <= 60
              ? 3
              : 4
    return { date: dateKey(date), ...values, intensity }
  })
}

function streakFromActivity(activity: Array<{ date: string; minutesActive: number }>) {
  const active = new Set(activity.filter((day) => day.minutesActive > 0).map((day) => day.date))
  let longestDays = 0
  let running = 0
  activity.forEach((day) => {
    running = active.has(day.date) ? running + 1 : 0
    longestDays = Math.max(longestDays, running)
  })

  const cursor = new Date()
  cursor.setUTCHours(0, 0, 0, 0)
  if (!active.has(dateKey(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1)
  let currentDays = 0
  while (active.has(dateKey(cursor))) {
    currentDays += 1
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }
  return { currentDays, longestDays }
}

function mockSkills(userId: string) {
  let stored: Record<string, StoredAttempt[]> = {}
  try {
    stored = JSON.parse(window.localStorage.getItem(`fluent-course-attempts:${userId}`) ?? '{}')
  } catch {
    stored = {}
  }
  const totals = new Map<
    string,
    { attempts: number; earnedPoints: number; possiblePoints: number }
  >()
  Object.entries(stored).forEach(([blockId, attempts]) => {
    const block = mockLessonBlocks.find((entry) => entry.id === blockId)
    if (!block) return
    const skill = blockSkill(block.type)
    const current = totals.get(skill) ?? { attempts: 0, earnedPoints: 0, possiblePoints: 0 }
    attempts.forEach((attempt) => {
      current.attempts += 1
      current.earnedPoints += attempt.score
      current.possiblePoints += attempt.maxScore
    })
    totals.set(skill, current)
  })
  return skillCatalog.map(([slug, name]) => {
    const total = totals.get(slug) ?? { attempts: 0, earnedPoints: 0, possiblePoints: 0 }
    return {
      slug,
      name,
      ...total,
      performancePercent:
        total.possiblePoints > 0
          ? Math.round((total.earnedPoints / total.possiblePoints) * 100)
          : null,
    }
  })
}

function mockMilestones(
  lessonsCompleted: number,
  modulesCompleted: number,
  levelsCompleted: number,
  currentStreak: number,
  bestAccuracy: number,
) {
  const definitions = [
    ['first-step', 'First Step', 'Complete your first lesson', lessonsCompleted, 1],
    ['getting-started', 'Getting Started', 'Complete five lessons', lessonsCompleted, 5],
    ['first-module', 'First Module', 'Complete your first module', modulesCompleted, 1],
    ['consistent-week', 'Consistent Week', 'Study on seven consecutive days', currentStreak, 7],
    ['perfect-lesson', 'Perfect Lesson', 'Reach 100% accuracy in a lesson', bestAccuracy, 100],
    ['level-complete', 'Level Complete', 'Complete one CEFR level', levelsCompleted, 1],
  ] as const
  return definitions.map(([slug, title, description, value, target]) => ({
    slug,
    title,
    description,
    unlocked: value >= target,
    unlockedAt: null,
    progressPercent: Math.min(100, Math.round((value / target) * 100)),
  }))
}

function getMockProgressSummary(userId: string): ProgressSummary {
  const courseProgress = getMockCourseProgress(userId)
  const activity = mockActivity(courseProgress)
  const streak = streakFromActivity(activity)
  const completedLessons = courseProgress.lessons.filter((entry) => entry.status === 'completed')
  const completedModules = courseProgress.modules.filter((entry) =>
    ['completed', 'mastered'].includes(entry.status),
  )
  const completedLevels = courseProgress.levels.filter((entry) =>
    ['completed', 'mastered'].includes(entry.status),
  )
  const accuracies = completedLessons
    .map((entry) => entry.accuracyPercent)
    .filter((value): value is number => typeof value === 'number')
  const averageAccuracy = accuracies.length
    ? Math.round(accuracies.reduce((sum, value) => sum + value, 0) / accuracies.length)
    : null
  const bestAccuracy = accuracies.length ? Math.max(...accuracies) : 0
  const currentLevel =
    mockLevels.find((level) =>
      courseProgress.levels.some(
        (entry) => entry.entityId === level.id && entry.status === 'in_progress',
      ),
    ) ?? mockLevels[0]
  const currentLevelProgress = courseProgress.levels.find(
    (entry) => entry.entityId === currentLevel.id,
  )
  const levelModules = mockModules.filter(
    (module) => module.level_id === currentLevel.id && module.is_required,
  )
  const levelModulesCompleted = levelModules.filter((module) =>
    courseProgress.modules.some(
      (entry) => entry.entityId === module.id && ['completed', 'mastered'].includes(entry.status),
    ),
  ).length
  const weekStartsOn = startOfWeek(new Date())
  const completedDays = activity.filter(
    (day) => day.date >= dateKey(weekStartsOn) && day.minutesActive > 0,
  ).length
  const targetDays = 5
  const overallProgress = Math.round(
    courseProgress.levels.reduce((sum, level) => sum + level.completionPercent, 0) / 4,
  )

  return progressSummarySchema.parse({
    courseProgress,
    overallProgress,
    averageAccuracy,
    lessonsCompleted: completedLessons.length,
    lessonsTotal: mockLessons.filter((lesson) => lesson.is_required).length,
    modulesCompleted: completedModules.length,
    modulesTotal: mockModules.filter((module) => module.is_required).length,
    levelsCompleted: completedLevels.length,
    levelsTotal: 4,
    currentLevel: {
      id: currentLevel.id,
      slug: currentLevel.slug,
      cefr: currentLevel.cefr,
      title: currentLevel.title,
      completionPercent: currentLevelProgress?.completionPercent ?? 0,
      modulesCompleted: levelModulesCompleted,
      modulesTotal: levelModules.length,
    },
    weeklyGoal: {
      targetDays,
      completedDays,
      remainingDays: Math.max(0, targetDays - completedDays),
      weekStartsOn: dateKey(weekStartsOn),
    },
    streak,
    skills: mockSkills(userId),
    activity,
    milestones: mockMilestones(
      completedLessons.length,
      completedModules.length,
      completedLevels.length,
      streak.currentDays,
      bestAccuracy,
    ),
  })
}

export async function getProgressSummary(context: CourseDataContext): Promise<ProgressSummary> {
  if (context.isMock) return getMockProgressSummary(context.userId)
  if (!supabase) throw new Error('Supabase is not configured for progress data.')

  const { data, error } = await supabase.rpc('get_progress_summary')
  if (error) throw error
  return progressSummarySchema.parse(data)
}
