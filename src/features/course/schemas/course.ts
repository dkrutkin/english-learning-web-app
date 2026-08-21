import { z } from 'zod'

export const courseProgressStatusSchema = z.enum([
  'locked',
  'available',
  'in_progress',
  'completed',
  'mastered',
])

export const learningProgressStatusSchema = z.enum(['not_started', 'in_progress', 'completed'])

export const lessonBlockTypeSchema = z.enum([
  'intro',
  'text',
  'grammar',
  'vocabulary',
  'example',
  'single_choice',
  'multiple_choice',
  'fill_gap',
  'matching',
  'sentence_builder',
  'reading',
  'reading_question',
  'listening',
  'listening_question',
  'writing_prompt',
  'speaking_prompt',
  'info',
  'summary',
  'quiz',
])

const publishedStatusSchema = z.literal('published')

export const levelRowSchema = z
  .object({
    id: z.string().uuid(),
    slug: z.string().min(1),
    cefr: z.enum(['A2', 'B1', 'B2', 'C1']),
    title: z.string().min(1),
    description: z.string(),
    order_index: z.number().int().positive(),
    illustration_url: z.string().url().nullable(),
    status: publishedStatusSchema,
  })
  .transform((row) => ({
    id: row.id,
    slug: row.slug,
    cefr: row.cefr,
    title: row.title,
    description: row.description,
    orderIndex: row.order_index,
    illustrationUrl: row.illustration_url,
    status: row.status,
  }))

export const moduleRowSchema = z
  .object({
    id: z.string().uuid(),
    level_id: z.string().uuid(),
    slug: z.string().min(1),
    title: z.string().min(1),
    description: z.string(),
    learning_outcome: z.string(),
    illustration_url: z.string().url().nullable(),
    icon: z.string().nullable(),
    order_index: z.number().int().positive(),
    estimated_minutes: z.number().int().nonnegative(),
    is_required: z.boolean(),
    status: publishedStatusSchema,
  })
  .transform((row) => ({
    id: row.id,
    levelId: row.level_id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    learningOutcome: row.learning_outcome,
    illustrationUrl: row.illustration_url,
    icon: row.icon,
    orderIndex: row.order_index,
    estimatedMinutes: row.estimated_minutes,
    isRequired: row.is_required,
    status: row.status,
  }))

export const lessonRowSchema = z
  .object({
    id: z.string().uuid(),
    module_id: z.string().uuid(),
    slug: z.string().min(1),
    title: z.string().min(1),
    description: z.string(),
    order_index: z.number().int().positive(),
    estimated_minutes: z.number().int().nonnegative(),
    is_required: z.boolean(),
    status: publishedStatusSchema,
    version: z.number().int().positive(),
  })
  .transform((row) => ({
    id: row.id,
    moduleId: row.module_id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    orderIndex: row.order_index,
    estimatedMinutes: row.estimated_minutes,
    isRequired: row.is_required,
    status: row.status,
    version: row.version,
  }))

const genericBlockContentSchema = z.record(z.string(), z.unknown())
const bodyContentSchema = z.object({ body: z.string().min(1) }).passthrough()
const grammarContentSchema = z
  .object({
    explanation: z.string().min(1),
    formula: z.string().optional(),
    examples: z.array(z.string()).optional(),
  })
  .passthrough()
const vocabularyContentSchema = z
  .object({
    items: z.array(
      z.object({
        term: z.string().min(1),
        definition: z.string().min(1),
        example: z.string().optional(),
        translation: z.string().optional(),
      }),
    ),
  })
  .passthrough()
const exampleContentSchema = z
  .object({ example: z.string().min(1), note: z.string().optional() })
  .passthrough()
const exerciseContentSchema = z
  .object({
    prompt: z.string().min(1),
    options: z.array(z.string()).optional(),
  })
  .passthrough()
const listeningContentSchema = z
  .object({
    transcript: z.string().min(1),
    instructions: z.string().optional(),
    audioUrl: z.string().url().optional(),
  })
  .passthrough()
const quizContentSchema = z
  .object({
    prompt: z.string().min(1),
    questions: z
      .array(
        z.object({
          prompt: z.string().min(1),
          options: z.array(z.string().min(1)).min(2),
        }),
      )
      .min(1),
  })
  .passthrough()

const blockContentSchemas: Partial<
  Record<z.infer<typeof lessonBlockTypeSchema>, z.ZodType<Record<string, unknown>>>
> = {
  intro: bodyContentSchema,
  text: bodyContentSchema,
  info: bodyContentSchema,
  summary: bodyContentSchema,
  reading: bodyContentSchema,
  listening: listeningContentSchema,
  grammar: grammarContentSchema,
  vocabulary: vocabularyContentSchema,
  example: exampleContentSchema,
  single_choice: exerciseContentSchema,
  multiple_choice: exerciseContentSchema,
  fill_gap: exerciseContentSchema,
  matching: exerciseContentSchema,
  sentence_builder: exerciseContentSchema,
  reading_question: exerciseContentSchema,
  listening_question: exerciseContentSchema,
  writing_prompt: exerciseContentSchema,
  speaking_prompt: exerciseContentSchema,
  quiz: quizContentSchema,
}

export const lessonBlockRowSchema = z
  .object({
    id: z.string().uuid(),
    lesson_id: z.string().uuid(),
    type: lessonBlockTypeSchema,
    title: z.string().nullable(),
    content: z.unknown(),
    order_index: z.number().int().positive(),
    is_required: z.boolean(),
    is_graded: z.boolean(),
  })
  .transform((row, context) => {
    const contentSchema = blockContentSchemas[row.type] ?? genericBlockContentSchema
    const parsedContent = contentSchema.safeParse(row.content)
    if (!parsedContent.success) {
      parsedContent.error.issues.forEach((issue) =>
        context.addIssue({
          code: 'custom',
          message: `Invalid ${row.type} block content: ${issue.message}`,
          path: ['content', ...issue.path],
        }),
      )
      return z.NEVER
    }

    return {
      id: row.id,
      lessonId: row.lesson_id,
      type: row.type,
      title: row.title,
      content: parsedContent.data,
      orderIndex: row.order_index,
      isRequired: row.is_required,
      isGraded: row.is_graded,
    }
  })

export const levelProgressRowSchema = z
  .object({
    level_id: z.string().uuid(),
    completion_percent: z.coerce.number().min(0).max(100),
    average_accuracy: z.coerce.number().min(0).max(100).nullable(),
    assessment_score: z.coerce.number().min(0).max(100).nullable(),
    status: courseProgressStatusSchema,
  })
  .transform((row) => ({
    entityId: row.level_id,
    completionPercent: row.completion_percent,
    averageAccuracy: row.average_accuracy,
    assessmentScore: row.assessment_score,
    status: row.status,
  }))

export const moduleProgressRowSchema = z
  .object({
    module_id: z.string().uuid(),
    completion_percent: z.coerce.number().min(0).max(100),
    average_accuracy: z.coerce.number().min(0).max(100).nullable(),
    assessment_score: z.coerce.number().min(0).max(100).nullable(),
    status: courseProgressStatusSchema,
  })
  .transform((row) => ({
    entityId: row.module_id,
    completionPercent: row.completion_percent,
    averageAccuracy: row.average_accuracy,
    assessmentScore: row.assessment_score,
    status: row.status,
  }))

export const lessonProgressRowSchema = z
  .object({
    lesson_id: z.string().uuid(),
    completion_percent: z.coerce.number().min(0).max(100),
    accuracy_percent: z.coerce.number().min(0).max(100).nullable(),
    status: learningProgressStatusSchema,
    last_activity_at: z.string().datetime().nullable(),
  })
  .transform((row) => ({
    entityId: row.lesson_id,
    completionPercent: row.completion_percent,
    accuracyPercent: row.accuracy_percent,
    status: row.status,
    lastActivityAt: row.last_activity_at,
  }))

export const levelsResponseSchema = z.array(levelRowSchema)
export const modulesResponseSchema = z.array(moduleRowSchema)
export const lessonsResponseSchema = z.array(lessonRowSchema)
export const lessonBlocksResponseSchema = z.array(lessonBlockRowSchema)
export const levelProgressResponseSchema = z.array(levelProgressRowSchema)
export const moduleProgressResponseSchema = z.array(moduleProgressRowSchema)
export const lessonProgressResponseSchema = z.array(lessonProgressRowSchema)

export const lessonSessionRowSchema = z
  .object({
    lesson_id: z.string().uuid(),
    current_block_id: z.string().uuid().nullable(),
    draft_answers: z.record(z.string(), z.unknown()),
    attempts: z.record(z.string(), z.number().int().nonnegative()).default({}),
    feedback: z
      .record(
        z.string(),
        z.object({
          isCorrect: z.boolean(),
          score: z.coerce.number().nonnegative(),
          maxScore: z.coerce.number().positive(),
          attemptNumber: z.number().int().positive(),
          usedHint: z.boolean(),
        }),
      )
      .default({}),
    used_hints: z.array(z.string().uuid()).default([]),
    score: z.coerce.number().nonnegative().default(0),
    possible_score: z.coerce.number().nonnegative().default(0),
    updated_at: z.string().datetime(),
  })
  .transform((row) => ({
    lessonId: row.lesson_id,
    currentBlockId: row.current_block_id,
    draftAnswers: row.draft_answers,
    attempts: row.attempts,
    feedback: row.feedback,
    usedHints: row.used_hints,
    score: row.score,
    possibleScore: row.possible_score,
    updatedAt: row.updated_at,
  }))

export const answerResultSchema = z.object({
  isCorrect: z.boolean(),
  score: z.coerce.number().nonnegative(),
  maxScore: z.coerce.number().positive(),
  attemptNumber: z.number().int().positive(),
  usedHint: z.boolean(),
})

export const lessonResultSchema = z.object({
  lessonCompleted: z.literal(true),
  moduleCompleted: z.boolean(),
  moduleCompletionPercent: z.coerce.number().min(0).max(100),
  accuracyPercent: z.coerce.number().min(0).max(100),
  unlockedAchievements: z.array(z.string()),
})
