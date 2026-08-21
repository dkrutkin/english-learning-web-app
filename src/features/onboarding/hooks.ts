import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthProvider'
import { getOnboardingStatus } from './api'

export const onboardingStatusQueryKey = (userId: string) => ['profile', userId, 'onboarding']

export function useOnboardingStatus() {
  const { isMock, user } = useAuth()

  return useQuery({
    queryKey: onboardingStatusQueryKey(user?.id ?? 'anonymous'),
    queryFn: () => getOnboardingStatus(user!.id, isMock),
    enabled: Boolean(user),
    staleTime: Number.POSITIVE_INFINITY,
  })
}
