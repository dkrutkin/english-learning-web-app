import { supabase } from '../../../lib/supabase/client'
import { achievementNotificationsSchema, achievementsOverviewSchema } from '../schemas/course'
import type { AchievementsOverview, CourseDataContext } from '../types/course'
import { mockLevels, mockModules } from './mock-course'
import { getProgressSummary } from './progress-summary-api'

const definitions = [
  {
    id: '81000000-0000-4000-8000-000000000001',
    slug: 'first-step',
    title: 'First Step',
    description: 'Complete your first lesson',
    category: 'progress',
    icon: 'sparkles',
    metric: 'lessonsCompleted',
    target: 1,
  },
  {
    id: '81000000-0000-4000-8000-000000000002',
    slug: 'getting-started',
    title: 'Getting Started',
    description: 'Complete five lessons',
    category: 'progress',
    icon: 'book-open',
    metric: 'lessonsCompleted',
    target: 5,
  },
  {
    id: '81000000-0000-4000-8000-000000000003',
    slug: 'first-module',
    title: 'First Module',
    description: 'Complete your first module',
    category: 'progress',
    icon: 'check-circle',
    metric: 'modulesCompleted',
    target: 1,
  },
  {
    id: '81000000-0000-4000-8000-000000000004',
    slug: 'consistent-week',
    title: 'Consistent Week',
    description: 'Study on seven consecutive days',
    category: 'consistency',
    icon: 'flame',
    metric: 'longestStreak',
    target: 7,
  },
  {
    id: '81000000-0000-4000-8000-000000000005',
    slug: 'perfect-lesson',
    title: 'Perfect Lesson',
    description: 'Reach 100% accuracy in a lesson',
    category: 'accuracy',
    icon: 'target',
    metric: 'bestAccuracy',
    target: 100,
  },
  {
    id: '81000000-0000-4000-8000-000000000006',
    slug: 'level-complete',
    title: 'Level Complete',
    description: 'Complete one CEFR level',
    category: 'mastery',
    icon: 'award',
    metric: 'levelsCompleted',
    target: 1,
  },
] as const

type UnlockHistory = Record<string, string>

function historyKey(userId: string) {
  return `fluent-achievements:${userId}`
}

function readHistory(userId: string): UnlockHistory {
  try {
    return JSON.parse(window.localStorage.getItem(historyKey(userId)) ?? '{}')
  } catch {
    return {}
  }
}

function metricValues(summary: Awaited<ReturnType<typeof getProgressSummary>>) {
  const bestAccuracy = summary.courseProgress.lessons.reduce(
    (best, lesson) => Math.max(best, lesson.accuracyPercent ?? 0),
    0,
  )
  return {
    lessonsCompleted: summary.lessonsCompleted,
    modulesCompleted: summary.modulesCompleted,
    levelsCompleted: summary.levelsCompleted,
    longestStreak: summary.streak.longestDays,
    bestAccuracy,
  }
}

export async function evaluateAchievements(context: CourseDataContext) {
  if (!context.isMock) {
    if (!supabase) throw new Error('Supabase is not configured for achievements.')
    const { data, error } = await supabase.rpc('evaluate_user_achievements')
    if (error) throw error
    return achievementNotificationsSchema.parse(data)
  }

  const summary = await getProgressSummary(context)
  const values = metricValues(summary)
  const history = readHistory(context.userId)
  const unlockedAt = new Date().toISOString()
  const newlyUnlocked = definitions
    .filter(
      (achievement) =>
        values[achievement.metric] >= achievement.target && !history[achievement.slug],
    )
    .map((achievement) => ({ ...achievement, unlockedAt }))
  newlyUnlocked.forEach((achievement) => {
    history[achievement.slug] = achievement.unlockedAt
  })
  window.localStorage.setItem(historyKey(context.userId), JSON.stringify(history))
  return achievementNotificationsSchema.parse(newlyUnlocked)
}

async function getMockOverview(context: CourseDataContext): Promise<AchievementsOverview> {
  await evaluateAchievements(context)
  const summary = await getProgressSummary(context)
  const values = metricValues(summary)
  const history = readHistory(context.userId)
  const fallbackDate =
    summary.courseProgress.lessons
      .map((lesson) => lesson.lastActivityAt)
      .filter((date): date is string => Boolean(date))
      .sort()
      .at(-1) ?? new Date().toISOString()

  const achievements = definitions.map((achievement) => {
    const currentValue = values[achievement.metric]
    return {
      ...achievement,
      unlocked: currentValue >= achievement.target,
      unlockedAt: history[achievement.slug] ?? null,
      currentValue,
      targetValue: achievement.target,
      progressPercent: Math.min(100, Math.round((currentValue / achievement.target) * 100)),
    }
  })
  const moduleSeals = summary.courseProgress.modules
    .filter((progress) => progress.status === 'completed' || progress.status === 'mastered')
    .flatMap((progress) => {
      const module = mockModules.find((entry) => entry.id === progress.entityId)
      const level = mockLevels.find((entry) => entry.id === module?.level_id)
      return module && level
        ? [
            {
              id: module.id,
              slug: module.slug,
              title: module.title,
              level: level.cefr,
              status: progress.status,
              awardedAt: fallbackDate,
              score: progress.assessmentScore,
            },
          ]
        : []
    })
  const levelEmblems = summary.courseProgress.levels
    .filter((progress) => progress.status === 'completed' || progress.status === 'mastered')
    .flatMap((progress) => {
      const level = mockLevels.find((entry) => entry.id === progress.entityId)
      return level
        ? [
            {
              id: level.id,
              slug: level.slug,
              title: level.title,
              level: level.cefr,
              status: progress.status,
              awardedAt: fallbackDate,
              score: progress.assessmentScore,
            },
          ]
        : []
    })
  const timeline = [
    ...achievements
      .filter((achievement) => achievement.unlocked && achievement.unlockedAt)
      .map((achievement) => ({
        id: achievement.id,
        type: 'achievement' as const,
        title: achievement.title,
        subtitle: achievement.description,
        occurredAt: achievement.unlockedAt!,
      })),
    ...moduleSeals.map((seal) => ({
      id: seal.id,
      type: 'module_seal' as const,
      title: seal.title,
      subtitle: `${seal.level} Module Seal`,
      occurredAt: seal.awardedAt ?? fallbackDate,
    })),
    ...levelEmblems.map((emblem) => ({
      id: emblem.id,
      type: 'level_emblem' as const,
      title: `${emblem.level} ${emblem.title}`,
      subtitle: 'Level Emblem',
      occurredAt: emblem.awardedAt ?? fallbackDate,
    })),
  ].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))

  return achievementsOverviewSchema.parse({ achievements, moduleSeals, levelEmblems, timeline })
}

export async function getAchievementsOverview(context: CourseDataContext) {
  if (context.isMock) return getMockOverview(context)
  if (!supabase) throw new Error('Supabase is not configured for achievements.')
  const { data, error } = await supabase.rpc('get_achievements_overview')
  if (error) throw error
  return achievementsOverviewSchema.parse(data)
}
