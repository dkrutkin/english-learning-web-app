import { supabase } from '../../lib/supabase/client'
import type { Database } from '../../lib/supabase/database.types'
import { accountProfileSchema } from './schemas'
import type { AccountProfile, ProfileUpdate } from './types'

const mockProfileKey = (userId: string) => `fluent-account-profile:${userId}`
const avatarBucket = 'avatars'

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured for profile data.')
  return supabase
}

function mockProfile(userId: string, email: string, displayName?: string): AccountProfile {
  const fallback: AccountProfile = {
    id: userId,
    email,
    displayName: displayName?.trim() || 'Demo Learner',
    avatarPath: null,
    avatarUrl: null,
    currentLevel: { id: 'mock-level-b1', cefr: 'B1', title: 'Independent English' },
    learningGoal: 'general',
    weeklyGoal: 5,
    theme: 'system',
    showTranslations: false,
  }
  try {
    const stored = window.localStorage.getItem(mockProfileKey(userId))
    return stored ? accountProfileSchema.parse({ ...fallback, ...JSON.parse(stored) }) : fallback
  } catch {
    return fallback
  }
}

async function avatarSignedUrl(path: string | null) {
  if (!path) return null
  if (/^https?:\/\//.test(path)) return path
  const { data, error } = await requireSupabase()
    .storage.from(avatarBucket)
    .createSignedUrl(path, 3600)
  if (error) throw error
  return data.signedUrl
}

export async function getAccountProfile(
  userId: string,
  email: string,
  isMock: boolean,
  metadataDisplayName?: string,
): Promise<AccountProfile> {
  if (isMock) return mockProfile(userId, email, metadataDisplayName)

  const client = requireSupabase()
  const { data, error } = await client
    .from('profiles')
    .select(
      'id, email, display_name, avatar_url, current_level_id, learning_goal, weekly_goal, theme, show_translations',
    )
    .eq('id', userId)
    .single()
  if (error) throw error

  let currentLevel: AccountProfile['currentLevel'] = null
  if (data.current_level_id) {
    const levelResult = await client
      .from('levels')
      .select('id, cefr, title')
      .eq('id', data.current_level_id)
      .maybeSingle()
    if (levelResult.error) throw levelResult.error
    currentLevel = levelResult.data
  }

  return accountProfileSchema.parse({
    id: data.id,
    email: data.email,
    displayName: data.display_name?.trim() || email.split('@')[0] || 'Learner',
    avatarPath: data.avatar_url,
    avatarUrl: await avatarSignedUrl(data.avatar_url),
    currentLevel,
    learningGoal: data.learning_goal,
    weeklyGoal: data.weekly_goal,
    theme: data.theme,
    showTranslations: data.show_translations,
  })
}

export async function updateAccountProfile(
  userId: string,
  email: string,
  isMock: boolean,
  updates: ProfileUpdate,
  metadataDisplayName?: string,
) {
  if (isMock) {
    const next = accountProfileSchema.parse({
      ...mockProfile(userId, email, metadataDisplayName),
      ...(updates.displayName !== undefined ? { displayName: updates.displayName.trim() } : {}),
      ...(updates.learningGoal !== undefined ? { learningGoal: updates.learningGoal } : {}),
      ...(updates.weeklyGoal !== undefined ? { weeklyGoal: updates.weeklyGoal } : {}),
      ...(updates.theme !== undefined ? { theme: updates.theme } : {}),
      ...(updates.showTranslations !== undefined
        ? { showTranslations: updates.showTranslations }
        : {}),
    })
    window.localStorage.setItem(mockProfileKey(userId), JSON.stringify(next))
    return next
  }

  const values: Database['public']['Tables']['profiles']['Update'] = {}
  if (updates.displayName !== undefined) values.display_name = updates.displayName.trim()
  if (updates.learningGoal !== undefined) values.learning_goal = updates.learningGoal
  if (updates.weeklyGoal !== undefined) values.weekly_goal = updates.weeklyGoal
  if (updates.theme !== undefined) values.theme = updates.theme
  if (updates.showTranslations !== undefined) values.show_translations = updates.showTranslations
  const { error } = await requireSupabase().from('profiles').update(values).eq('id', userId)
  if (error) throw error
}

export async function uploadAvatar(userId: string, isMock: boolean, file: File) {
  if (file.size > 2 * 1024 * 1024) throw new Error('Avatar must be smaller than 2 MB.')
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Use a JPG, PNG or WebP image.')
  }

  if (isMock) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('Could not read this image.'))
      reader.readAsDataURL(file)
    })
    const profile = mockProfile(userId, 'demo@fluent.local')
    window.localStorage.setItem(
      mockProfileKey(userId),
      JSON.stringify({ ...profile, avatarPath: 'mock-avatar', avatarUrl: dataUrl }),
    )
    return
  }

  const client = requireSupabase()
  const path = `${userId}/avatar`
  const upload = await client.storage.from(avatarBucket).upload(path, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: true,
  })
  if (upload.error) throw upload.error
  const { error } = await client.from('profiles').update({ avatar_url: path }).eq('id', userId)
  if (error) throw error
}

export async function removeAvatar(userId: string, isMock: boolean, avatarPath: string | null) {
  if (isMock) {
    const profile = mockProfile(userId, 'demo@fluent.local')
    window.localStorage.setItem(
      mockProfileKey(userId),
      JSON.stringify({ ...profile, avatarPath: null, avatarUrl: null }),
    )
    return
  }

  const client = requireSupabase()
  if (avatarPath && !/^https?:\/\//.test(avatarPath)) {
    const { error } = await client.storage.from(avatarBucket).remove([avatarPath])
    if (error) throw error
  }
  const { error } = await client.from('profiles').update({ avatar_url: null }).eq('id', userId)
  if (error) throw error
}
