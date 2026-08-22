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

const hintSchema = z.string().min(1).optional()
const bodyContentSchema = z
  .object({ body: z.string().min(1), label: z.string().min(1).optional() })
  .passthrough()
const grammarContentSchema = z
  .object({
    explanation: z.string().min(1),
    formula: z.string().optional(),
    examples: z.array(z.string().min(1)).min(1).optional(),
    note: z.string().min(1).optional(),
  })
  .passthrough()
const vocabularyContentSchema = z
  .object({
    items: z
      .array(
        z.object({
          term: z.string().min(1),
          definition: z.string().min(1),
          example: z.string().min(1).optional(),
          translation: z.string().min(1).optional(),
        }),
      )
      .min(1),
  })
  .passthrough()
const exampleContentSchema = z
  .object({ example: z.string().min(1), note: z.string().optional() })
  .passthrough()
const choiceContentSchema = z
  .object({
    prompt: z.string().min(1),
    options: z.array(z.string().min(1)).min(2),
    hint: hintSchema,
  })
  .passthrough()
const fillGapContentSchema = z
  .object({
    prompt: z.string().min(1),
    placeholder: z.string().min(1).optional(),
    hint: hintSchema,
  })
  .passthrough()
const matchingContentSchema = z
  .object({
    prompt: z.string().min(1),
    pairs: z
      .array(
        z.object({
          left: z.string().min(1),
          right: z.string().min(1),
        }),
      )
      .min(2),
    hint: hintSchema,
  })
  .passthrough()
const sentenceBuilderContentSchema = z
  .object({
    prompt: z.string().min(1),
    tokens: z.array(z.string().min(1)).min(2),
    hint: hintSchema,
  })
  .passthrough()
const writingContentSchema = z
  .object({
    prompt: z.string().min(1),
    placeholder: z.string().min(1).optional(),
    minWords: z.number().int().positive().optional(),
    example: z.string().min(1).optional(),
  })
  .passthrough()
const speakingContentSchema = z
  .object({
    prompt: z.string().min(1),
    placeholder: z.string().min(1).optional(),
    suggestedSeconds: z.number().int().positive().optional(),
    tips: z.array(z.string().min(1)).optional(),
  })
  .passthrough()
const listeningContentSchema = z
  .object({
    transcript: z.string().min(1).optional(),
    instructions: z.string().min(1).optional(),
    audioUrl: z.string().url().optional(),
  })
  .passthrough()
  .refine((content) => Boolean(content.transcript || content.audioUrl), {
    message: 'A transcript or audioUrl is required',
  })
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

const blockContentSchemas: Record<
  z.infer<typeof lessonBlockTypeSchema>,
  z.ZodType<Record<string, unknown>>
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
  single_choice: choiceContentSchema,
  multiple_choice: choiceContentSchema,
  fill_gap: fillGapContentSchema,
  matching: matchingContentSchema,
  sentence_builder: sentenceBuilderContentSchema,
  reading_question: choiceContentSchema,
  listening_question: choiceContentSchema,
  writing_prompt: writingContentSchema,
  speaking_prompt: speakingContentSchema,
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
    const contentSchema = blockContentSchemas[row.type]
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
    completion_percent: z.coerce.number().min(0).max(100).default(0),
    active_seconds: z.number().int().nonnegative().default(0),
    started_at: z.string().datetime().nullable().default(null),
    completed_at: z.string().datetime().nullable().default(null),
    revision: z.number().int().nonnegative().default(0),
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
    completionPercent: row.completion_percent,
    activeSeconds: row.active_seconds,
    startedAt: row.started_at ?? row.updated_at,
    completedAt: row.completed_at,
    revision: row.revision,
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
  lessonKind: z.enum(['lesson', 'module_assessment', 'level_assessment']),
  score: z.coerce.number().nonnegative(),
  possibleScore: z.coerce.number().nonnegative(),
  moduleCompleted: z.boolean(),
  moduleMastered: z.boolean(),
  moduleCompletionPercent: z.coerce.number().min(0).max(100),
  moduleAssessmentScore: z.coerce.number().min(0).max(100).nullable(),
  moduleStatus: courseProgressStatusSchema,
  moduleSealAwarded: z.boolean(),
  levelCompleted: z.boolean(),
  levelMastered: z.boolean(),
  levelCompletionPercent: z.coerce.number().min(0).max(100),
  levelAssessmentScore: z.coerce.number().min(0).max(100).nullable(),
  levelStatus: courseProgressStatusSchema,
  levelEmblemAwarded: z.boolean(),
  accuracyPercent: z.coerce.number().min(0).max(100),
  skillBreakdown: z.array(
    z.object({
      skill: z.enum([
        'vocabulary',
        'grammar',
        'reading',
        'listening',
        'writing',
        'speaking',
        'mixed',
      ]),
      score: z.coerce.number().nonnegative(),
      maxScore: z.coerce.number().nonnegative(),
      accuracyPercent: z.coerce.number().min(0).max(100),
    }),
  ),
  answerReview: z.array(
    z.object({
      blockId: z.string().uuid(),
      title: z.string(),
      skill: z.enum([
        'vocabulary',
        'grammar',
        'reading',
        'listening',
        'writing',
        'speaking',
        'mixed',
      ]),
      isCorrect: z.boolean(),
      score: z.coerce.number().nonnegative(),
      maxScore: z.coerce.number().nonnegative(),
      userAnswer: z.unknown(),
      correctAnswer: z.unknown(),
    }),
  ),
  nextLesson: z.object({ slug: z.string().min(1), title: z.string().min(1) }).nullable(),
  nextModule: z.object({ slug: z.string().min(1), title: z.string().min(1) }).nullable(),
  nextLevel: z.object({ slug: z.string().min(1), title: z.string().min(1) }).nullable(),
  unlockedAchievements: z.array(z.string()),
})

const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const levelProgressValueSchema = z.object({
  entityId: z.string().uuid(),
  completionPercent: z.coerce.number().min(0).max(100),
  averageAccuracy: z.coerce.number().min(0).max(100).nullable(),
  assessmentScore: z.coerce.number().min(0).max(100).nullable(),
  status: courseProgressStatusSchema,
})

const moduleProgressValueSchema = levelProgressValueSchema

const lessonProgressValueSchema = z.object({
  entityId: z.string().uuid(),
  completionPercent: z.coerce.number().min(0).max(100),
  accuracyPercent: z.coerce.number().min(0).max(100).nullable(),
  status: learningProgressStatusSchema,
  lastActivityAt: z.string().datetime().nullable(),
})

export const progressSummarySchema = z.object({
  courseProgress: z.object({
    levels: z.array(levelProgressValueSchema),
    modules: z.array(moduleProgressValueSchema),
    lessons: z.array(lessonProgressValueSchema),
  }),
  overallProgress: z.coerce.number().min(0).max(100),
  averageAccuracy: z.coerce.number().min(0).max(100).nullable(),
  lessonsCompleted: z.number().int().nonnegative(),
  lessonsTotal: z.number().int().nonnegative(),
  modulesCompleted: z.number().int().nonnegative(),
  modulesTotal: z.number().int().nonnegative(),
  levelsCompleted: z.number().int().nonnegative(),
  levelsTotal: z.number().int().nonnegative(),
  currentLevel: z
    .object({
      id: z.string().uuid(),
      slug: z.string().min(1),
      cefr: z.enum(['A2', 'B1', 'B2', 'C1']),
      title: z.string().min(1),
      completionPercent: z.coerce.number().min(0).max(100),
      modulesCompleted: z.number().int().nonnegative(),
      modulesTotal: z.number().int().nonnegative(),
    })
    .nullable(),
  weeklyGoal: z.object({
    targetDays: z.number().int().positive(),
    completedDays: z.number().int().nonnegative(),
    remainingDays: z.number().int().nonnegative(),
    weekStartsOn: dateOnlySchema,
  }),
  streak: z.object({
    currentDays: z.number().int().nonnegative(),
    longestDays: z.number().int().nonnegative(),
  }),
  skills: z.array(
    z.object({
      slug: z.string().min(1),
      name: z.string().min(1),
      attempts: z.number().int().nonnegative(),
      earnedPoints: z.coerce.number().nonnegative(),
      possiblePoints: z.coerce.number().nonnegative(),
      performancePercent: z.coerce.number().min(0).max(100).nullable(),
    }),
  ),
  activity: z.array(
    z.object({
      date: dateOnlySchema,
      lessonsCompleted: z.number().int().nonnegative(),
      minutesActive: z.number().int().nonnegative(),
      intensity: z.number().int().min(0).max(4),
    }),
  ),
  milestones: z.array(
    z.object({
      slug: z.string().min(1),
      title: z.string().min(1),
      description: z.string().min(1),
      unlocked: z.boolean(),
      unlockedAt: z.string().datetime().nullable(),
      progressPercent: z.coerce.number().min(0).max(100),
    }),
  ),
})
