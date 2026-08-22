export const courseKeys = {
  all: ['course'] as const,
  levels: (source: 'mock' | 'remote') => [...courseKeys.all, source, 'levels'] as const,
  level: (source: 'mock' | 'remote', levelSlug: string) =>
    [...courseKeys.levels(source), levelSlug] as const,
  modules: (source: 'mock' | 'remote', levelSlug: string) =>
    [...courseKeys.level(source, levelSlug), 'modules'] as const,
  module: (source: 'mock' | 'remote', levelSlug: string, moduleSlug: string) =>
    [...courseKeys.modules(source, levelSlug), moduleSlug] as const,
  lessons: (source: 'mock' | 'remote', levelSlug: string, moduleSlug: string) =>
    [...courseKeys.module(source, levelSlug, moduleSlug), 'lessons'] as const,
  lesson: (source: 'mock' | 'remote', levelSlug: string, moduleSlug: string, lessonSlug: string) =>
    [...courseKeys.lessons(source, levelSlug, moduleSlug), lessonSlug] as const,
  blocks: (source: 'mock' | 'remote', levelSlug: string, moduleSlug: string, lessonSlug: string) =>
    [...courseKeys.lesson(source, levelSlug, moduleSlug, lessonSlug), 'blocks'] as const,
  progressSummary: (userId: string) => [...courseKeys.all, 'progress-summary', userId] as const,
  recommended: (userId: string) => [...courseKeys.all, 'recommended', userId] as const,
  session: (userId: string, lessonId: string) =>
    [...courseKeys.all, 'session', userId, lessonId] as const,
}
