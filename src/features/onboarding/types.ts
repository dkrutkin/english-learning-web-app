export type OnboardingStep = 1 | 2 | 3 | 4
export type CurrentLevel = 'A2' | 'B1' | 'B2' | 'not_sure'
export type LearningGoal = 'everyday' | 'career' | 'travel' | 'study' | 'general'
export type WeeklyGoal = 3 | 4 | 5 | 7

export type OnboardingDraft = {
  step: OnboardingStep
  currentLevel: CurrentLevel | null
  learningGoal: LearningGoal | null
  weeklyGoal: WeeklyGoal
}

export const initialOnboardingDraft: OnboardingDraft = {
  step: 1,
  currentLevel: null,
  learningGoal: null,
  weeklyGoal: 5,
}
