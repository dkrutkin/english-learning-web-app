import { z } from 'zod'

export const profileThemeSchema = z.enum(['light', 'dark', 'system'])
export const learningGoalSchema = z.enum(['everyday', 'career', 'travel', 'study', 'general'])
export const weeklyGoalSchema = z.union([z.literal(3), z.literal(4), z.literal(5), z.literal(7)])

export const accountProfileSchema = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.string(),
  avatarPath: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  currentLevel: z.object({ id: z.string(), cefr: z.string(), title: z.string() }).nullable(),
  learningGoal: learningGoalSchema.nullable(),
  weeklyGoal: weeklyGoalSchema,
  theme: profileThemeSchema,
  showTranslations: z.boolean(),
})

export const displayNameSchema = z
  .string()
  .trim()
  .min(2, 'Name must contain at least 2 characters.')
  .max(60, 'Name must contain no more than 60 characters.')
