import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Check,
  Compass,
  GraduationCap,
  MessageCircle,
  Sparkles,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { RouteFallback } from '../components/layout/RouteFallback'
import { useAuth } from '../features/auth/AuthProvider'
import {
  completeOnboarding,
  loadOnboardingDraft,
  saveOnboardingDraft,
} from '../features/onboarding/api'
import { onboardingStatusQueryKey, useOnboardingStatus } from '../features/onboarding/hooks'
import {
  initialOnboardingDraft,
  type CurrentLevel,
  type LearningGoal,
  type OnboardingDraft,
  type WeeklyGoal,
} from '../features/onboarding/types'

const levelOptions: Array<{
  value: CurrentLevel
  title: string
  label: string
  description: string
}> = [
  {
    value: 'A2',
    title: 'A2',
    label: 'Elementary',
    description: 'I can handle simple everyday conversations',
  },
  {
    value: 'B1',
    title: 'B1',
    label: 'Intermediate',
    description: 'I can talk about familiar topics and explain basic opinions',
  },
  {
    value: 'B2',
    title: 'B2',
    label: 'Upper Intermediate',
    description: 'I can communicate comfortably in most situations',
  },
  {
    value: 'not_sure',
    title: "I'm not sure",
    label: '',
    description: 'Help me choose where to start',
  },
]

const goalOptions: Array<{
  value: LearningGoal
  title: string
  description: string
  icon: typeof MessageCircle
}> = [
  {
    value: 'everyday',
    title: 'Everyday English',
    description: 'Feel confident in daily conversations',
    icon: MessageCircle,
  },
  {
    value: 'career',
    title: 'Career',
    description: 'Communicate clearly at work',
    icon: BriefcaseBusiness,
  },
  {
    value: 'travel',
    title: 'Travel',
    description: 'Navigate trips and meet new people',
    icon: Compass,
  },
  {
    value: 'study',
    title: 'Study',
    description: 'Learn and research in English',
    icon: GraduationCap,
  },
  {
    value: 'general',
    title: 'General improvement',
    description: 'Build balanced, practical skills',
    icon: Sparkles,
  },
]

const weeklyOptions: Array<{
  value: WeeklyGoal
  title: string
  description: string
  badge?: string
}> = [
  { value: 3, title: 'Light', description: '3 days · around 1 hour a week' },
  { value: 4, title: 'Balanced', description: '4 days · around 1.5 hours a week' },
  {
    value: 5,
    title: 'Consistent',
    description: '5 days · around 2 hours a week',
    badge: 'Recommended',
  },
  { value: 7, title: 'Intensive', description: 'Every day · steady progress' },
]

const stepContent = {
  1: {
    eyebrow: 'Starting point',
    title: "What's your current English level?",
    description: 'Choose the option that feels closest to your current skills',
  },
  2: {
    eyebrow: 'Your goal',
    title: 'What do you want English for?',
    description: "We'll keep your main goal in focus as you learn",
  },
  3: {
    eyebrow: 'Your routine',
    title: 'How often do you want to study?',
    description: 'Pick a pace that feels realistic for your week',
  },
  4: {
    eyebrow: 'All set',
    title: 'Your learning path is ready',
    description: 'You can update these preferences later in Settings',
  },
} as const

function ChoiceCard({
  checked,
  description,
  icon: Icon,
  label,
  name,
  onChange,
  title,
  value,
  badge,
}: {
  checked: boolean
  description: string
  icon?: typeof MessageCircle
  label?: string
  name: string
  onChange: () => void
  title: string
  value: string | number
  badge?: string
}) {
  return (
    <label className={checked ? 'onboarding-option is-selected' : 'onboarding-option'}>
      <input checked={checked} name={name} onChange={onChange} type="radio" value={value} />
      {Icon ? (
        <span aria-hidden="true" className="onboarding-option__icon">
          <Icon size={20} strokeWidth={1.8} />
        </span>
      ) : null}
      <span className="onboarding-option__copy">
        <span className="onboarding-option__title-row">
          <strong>{title}</strong>
          {label ? <span>{label}</span> : null}
          {badge ? <em>{badge}</em> : null}
        </span>
        <small>{description}</small>
      </span>
      <span aria-hidden="true" className="onboarding-option__check">
        {checked ? <Check size={16} strokeWidth={2.5} /> : null}
      </span>
    </label>
  )
}

export function OnboardingPage() {
  const { isMock, user } = useAuth()
  const status = useOnboardingStatus()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<OnboardingDraft>(() =>
    user ? (loadOnboardingDraft(user.id) ?? initialOnboardingDraft) : initialOnboardingDraft,
  )
  const content = stepContent[draft.step]

  useEffect(() => {
    if (user) saveOnboardingDraft(user.id, draft)
  }, [draft, user])

  const finishOnboarding = useMutation({
    mutationFn: () => completeOnboarding(user!.id, isMock, draft),
    onSuccess: () => {
      queryClient.setQueryData(onboardingStatusQueryKey(user!.id), true)
      navigate('/app/home', { replace: true })
    },
  })

  if (status.isPending) return <RouteFallback />
  if (status.data) return <Navigate replace to="/app/home" />

  if (status.isError) {
    return (
      <main className="onboarding-state">
        <h1>We couldn't load your profile</h1>
        <p>Check your connection and try again</p>
        <button className="button button--primary" onClick={() => status.refetch()}>
          Try again
        </button>
      </main>
    )
  }

  const updateDraft = (updates: Partial<OnboardingDraft>) =>
    setDraft((current) => ({ ...current, ...updates }))

  const continueToNextStep = () => {
    if (draft.step < 4) {
      updateDraft({ step: (draft.step + 1) as OnboardingDraft['step'] })
    }
  }

  const goBack = () => {
    if (draft.step > 1) {
      updateDraft({ step: (draft.step - 1) as OnboardingDraft['step'] })
    }
  }

  const isContinueDisabled =
    (draft.step === 1 && !draft.currentLevel) || (draft.step === 2 && !draft.learningGoal)

  const selectedLevel = levelOptions.find((option) => option.value === draft.currentLevel)
  const selectedGoal = goalOptions.find((option) => option.value === draft.learningGoal)
  const selectedWeeklyGoal = weeklyOptions.find((option) => option.value === draft.weeklyGoal)

  return (
    <main className="onboarding-page">
      <section className="onboarding-panel">
        <div
          aria-label={`Step ${draft.step} of 4`}
          aria-valuemax={4}
          aria-valuemin={1}
          aria-valuenow={draft.step}
          className="onboarding-progress"
          role="progressbar"
        >
          <div className="progress-line">
            <span style={{ width: `${draft.step * 25}%` }} />
          </div>
        </div>

        <div className="onboarding-heading">
          <p className="eyebrow">{content.eyebrow}</p>
          <h1>{content.title}</h1>
          <p>{content.description}</p>
        </div>

        {draft.step === 1 ? (
          <fieldset className="onboarding-options onboarding-options--levels">
            <legend>Current English level</legend>
            {levelOptions.map((option) => (
              <ChoiceCard
                checked={draft.currentLevel === option.value}
                description={option.description}
                key={option.value}
                label={option.label}
                name="current-level"
                onChange={() => updateDraft({ currentLevel: option.value })}
                title={option.title}
                value={option.value}
              />
            ))}
          </fieldset>
        ) : null}

        {draft.step === 2 ? (
          <fieldset className="onboarding-options onboarding-options--goals">
            <legend>Learning goal</legend>
            {goalOptions.map((option) => (
              <ChoiceCard
                checked={draft.learningGoal === option.value}
                description={option.description}
                icon={option.icon}
                key={option.value}
                name="learning-goal"
                onChange={() => updateDraft({ learningGoal: option.value })}
                title={option.title}
                value={option.value}
              />
            ))}
          </fieldset>
        ) : null}

        {draft.step === 3 ? (
          <fieldset className="onboarding-options onboarding-options--weekly">
            <legend>Weekly study goal</legend>
            {weeklyOptions.map((option) => (
              <ChoiceCard
                badge={option.badge}
                checked={draft.weeklyGoal === option.value}
                description={option.description}
                key={option.value}
                name="weekly-goal"
                onChange={() => updateDraft({ weeklyGoal: option.value })}
                title={option.title}
                value={option.value}
              />
            ))}
          </fieldset>
        ) : null}

        {draft.step === 4 ? (
          <dl className="onboarding-summary">
            <div>
              <dt>Starting level</dt>
              <dd>
                {selectedLevel?.value === 'not_sure' ? 'A2 · Recommended start' : null}
                {selectedLevel?.value !== 'not_sure'
                  ? `${selectedLevel?.title} · ${selectedLevel?.label}`
                  : null}
              </dd>
            </div>
            <div>
              <dt>Main goal</dt>
              <dd>{selectedGoal?.title}</dd>
            </div>
            <div>
              <dt>Weekly goal</dt>
              <dd>{selectedWeeklyGoal?.description}</dd>
            </div>
          </dl>
        ) : null}

        {finishOnboarding.isError ? (
          <p className="onboarding-error" role="alert">
            We couldn't save your learning path. Please try again
          </p>
        ) : null}

        <div className="onboarding-actions">
          {draft.step > 1 ? (
            <button className="button button--ghost onboarding-back" onClick={goBack}>
              <ArrowLeft size={18} /> Back
            </button>
          ) : (
            <span />
          )}
          {draft.step < 4 ? (
            <button
              className="button button--primary button--large"
              disabled={isContinueDisabled}
              onClick={continueToNextStep}
            >
              Continue <ArrowRight size={18} />
            </button>
          ) : (
            <button
              className="button button--primary button--large"
              disabled={finishOnboarding.isPending}
              onClick={() => finishOnboarding.mutate()}
            >
              {finishOnboarding.isPending ? 'Saving…' : 'Start learning'}
              {!finishOnboarding.isPending ? <ArrowRight size={18} /> : null}
            </button>
          )}
        </div>
      </section>
    </main>
  )
}
