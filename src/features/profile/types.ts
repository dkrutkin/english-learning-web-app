export type ProfileTheme = 'light' | 'dark' | 'system'
export type LearningGoal = 'everyday' | 'career' | 'travel' | 'study' | 'general'
export type WeeklyGoal = 3 | 4 | 5 | 7

export type AccountProfile = {
  id: string
  email: string
  displayName: string
  avatarPath: string | null
  avatarUrl: string | null
  currentLevel: {
    id: string
    cefr: string
    title: string
  } | null
  learningGoal: LearningGoal | null
  weeklyGoal: WeeklyGoal
  theme: ProfileTheme
  showTranslations: boolean
}

export type ProfileUpdate = {
  displayName?: string
  learningGoal?: LearningGoal
  weeklyGoal?: WeeklyGoal
  theme?: ProfileTheme
  showTranslations?: boolean
}
