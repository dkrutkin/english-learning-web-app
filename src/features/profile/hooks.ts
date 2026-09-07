import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthProvider'
import { courseKeys } from '../course/hooks/query-keys'
import { getAccountProfile, removeAvatar, updateAccountProfile, uploadAvatar } from './api'
import type { ProfileUpdate } from './types'

export const profileKeys = {
  all: ['account-profile'] as const,
  detail: (userId: string) => [...profileKeys.all, userId] as const,
}

function useProfileContext() {
  const { isMock, user } = useAuth()
  return {
    user,
    userId: user?.id ?? '',
    email: user?.email ?? '',
    displayName:
      typeof user?.user_metadata.display_name === 'string'
        ? user.user_metadata.display_name
        : undefined,
    isMock,
  }
}

export function useAccountProfile() {
  const context = useProfileContext()
  return useQuery({
    queryKey: profileKeys.detail(context.userId),
    queryFn: () =>
      getAccountProfile(context.userId, context.email, context.isMock, context.displayName),
    enabled: Boolean(context.user),
    staleTime: 60_000,
  })
}

export function useUpdateAccountProfile() {
  const context = useProfileContext()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (updates: ProfileUpdate) =>
      updateAccountProfile(
        context.userId,
        context.email,
        context.isMock,
        updates,
        context.displayName,
      ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: profileKeys.detail(context.userId) }),
        queryClient.invalidateQueries({ queryKey: courseKeys.profile(context.userId) }),
        queryClient.invalidateQueries({ queryKey: courseKeys.progressSummary(context.userId) }),
      ])
    },
  })
}

export function useAvatarMutation() {
  const context = useProfileContext()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ file, avatarPath }: { file?: File; avatarPath?: string | null }) =>
      file
        ? uploadAvatar(context.userId, context.isMock, file)
        : removeAvatar(context.userId, context.isMock, avatarPath ?? null),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: profileKeys.detail(context.userId) }),
  })
}
