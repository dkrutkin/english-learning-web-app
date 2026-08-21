import { supabase } from '../../lib/supabase/client'
import type { OnboardingDraft } from './types'

const draftStorageKey = (userId: string) => `fluent-onboarding-draft-v2:${userId}`
const mockCompletionStorageKey = (userId: string) => `fluent-onboarding-complete:${userId}`

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured for onboarding.')
  return supabase
}

export function loadOnboardingDraft(userId: string): OnboardingDraft | null {
  try {
    const rawDraft = window.localStorage.getItem(draftStorageKey(userId))
    if (!rawDraft) return null
    const draft = JSON.parse(rawDraft) as Partial<OnboardingDraft>
    if (![1, 2, 3, 4].includes(draft.step ?? 0)) return null
    if (![3, 4, 5, 7].includes(draft.weeklyGoal ?? 0)) return null
    if (draft.currentLevel && !['A2', 'B1', 'B2', 'not_sure'].includes(draft.currentLevel)) {
      return null
    }
    if (
      draft.learningGoal &&
      !['everyday', 'career', 'travel', 'study', 'general'].includes(draft.learningGoal)
    ) {
      return null
    }
    return draft as OnboardingDraft
  } catch {
    return null
  }
}

export function saveOnboardingDraft(userId: string, draft: OnboardingDraft) {
  window.localStorage.setItem(draftStorageKey(userId), JSON.stringify(draft))
}

export function clearOnboardingDraft(userId: string) {
  window.localStorage.removeItem(draftStorageKey(userId))
}

export async function getOnboardingStatus(userId: string, isMock: boolean) {
  if (isMock) return window.localStorage.getItem(mockCompletionStorageKey(userId)) === 'true'

  const { data, error } = await requireSupabase()
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data.onboarding_completed === true
}

export async function completeOnboarding(userId: string, isMock: boolean, draft: OnboardingDraft) {
  if (!draft.currentLevel || !draft.learningGoal) {
    throw new Error('Choose a level and learning goal before continuing.')
  }

  if (isMock) {
    window.localStorage.setItem(mockCompletionStorageKey(userId), 'true')
    clearOnboardingDraft(userId)
    return
  }

  const { error } = await requireSupabase().rpc('complete_onboarding', {
    p_current_level: draft.currentLevel,
    p_learning_goal: draft.learningGoal,
    p_weekly_goal: draft.weeklyGoal,
  })

  if (error) throw error
  clearOnboardingDraft(userId)
}
