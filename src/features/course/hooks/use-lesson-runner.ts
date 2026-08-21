import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../auth/AuthProvider'
import {
  completeLesson,
  getLessonSession,
  saveLessonSession,
  submitLessonAnswer,
} from '../api/lesson-runner-api'
import type { LessonAnswer, LessonSession } from '../types/course'
import { courseKeys } from './query-keys'

function useRunnerContext() {
  const { isMock, user } = useAuth()
  return { context: { userId: user?.id ?? '', isMock }, isAuthenticated: Boolean(user) }
}

export function useLessonSession(lessonId: string) {
  const { context, isAuthenticated } = useRunnerContext()
  return useQuery({
    queryKey: courseKeys.session(context.userId, lessonId),
    queryFn: () => getLessonSession(context, lessonId),
    enabled: isAuthenticated && Boolean(lessonId),
    staleTime: 0,
  })
}

export function useSaveLessonSession(lessonId: string) {
  const { context } = useRunnerContext()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (session: Omit<LessonSession, 'lessonId' | 'updatedAt'>) =>
      saveLessonSession(context, lessonId, session),
    onSuccess: (session) => {
      queryClient.setQueryData(courseKeys.session(context.userId, lessonId), session)
    },
  })
}

export function useSubmitLessonAnswer(lessonId: string) {
  const { context } = useRunnerContext()
  return useMutation({
    mutationFn: ({
      blockId,
      answer,
      usedHint,
    }: {
      blockId: string
      answer: LessonAnswer
      usedHint: boolean
    }) => submitLessonAnswer(context, lessonId, blockId, answer, usedHint),
  })
}

export function useCompleteLesson(lessonId: string) {
  const { context } = useRunnerContext()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => completeLesson(context, lessonId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: courseKeys.all })
    },
  })
}
