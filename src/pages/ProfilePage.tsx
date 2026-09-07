import { Camera, Check, Pencil, Trash2 } from 'lucide-react'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { CourseErrorState, CourseLoadingState } from '../features/course/components/CourseStates'
import { useProgressSummary } from '../features/course/hooks/use-course'
import {
  useAccountProfile,
  useAvatarMutation,
  useUpdateAccountProfile,
} from '../features/profile/hooks'
import { displayNameSchema } from '../features/profile/schemas'
import type { LearningGoal } from '../features/profile/types'

const goalLabels: Record<LearningGoal, string> = {
  everyday: 'Everyday English',
  career: 'Career English',
  travel: 'Travel',
  study: 'Study',
  general: 'General fluency',
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function ProfilePage() {
  const profile = useAccountProfile()
  const progress = useProgressSummary()
  const updateProfile = useUpdateAccountProfile()
  const avatarMutation = useAvatarMutation()
  const fileInput = useRef<HTMLInputElement>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [learningGoal, setLearningGoal] = useState<LearningGoal>('general')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!profile.data) return
    // oxlint-disable-next-line react/set-state-in-effect -- The editable draft follows asynchronously loaded profile data.
    setDisplayName(profile.data.displayName)
    setLearningGoal(profile.data.learningGoal ?? 'general')
  }, [profile.data])

  if (profile.isPending) {
    return (
      <div className="page-container">
        <CourseLoadingState cards={3} />
      </div>
    )
  }
  if (profile.isError || !profile.data) {
    return (
      <div className="page-container">
        <CourseErrorState onRetry={() => void profile.refetch()} />
      </div>
    )
  }

  const data = profile.data
  const summary = progress.data

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    const name = displayNameSchema.safeParse(displayName)
    if (!name.success) {
      setError(name.error.issues[0]?.message ?? 'Enter your name.')
      return
    }
    try {
      await updateProfile.mutateAsync({ displayName: name.data, learningGoal })
      setIsEditing(false)
      setMessage('Profile updated')
    } catch (updateError) {
      setError(
        updateError instanceof Error ? updateError.message : 'Could not update your profile.',
      )
    }
  }

  async function handleAvatar(file?: File) {
    if (!file) return
    setError(null)
    setMessage(null)
    try {
      await avatarMutation.mutateAsync({ file })
      setMessage('Avatar updated')
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Could not upload this image.')
    } finally {
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  async function handleRemoveAvatar() {
    setError(null)
    setMessage(null)
    try {
      await avatarMutation.mutateAsync({ avatarPath: data.avatarPath })
      setMessage('Avatar removed')
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Could not remove your avatar.')
    }
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1>Profile</h1>
          <p>Your account and learning overview</p>
        </div>
        {!isEditing && (
          <button className="button button--secondary" onClick={() => setIsEditing(true)}>
            <Pencil aria-hidden="true" size={17} /> Edit profile
          </button>
        )}
      </header>

      {error && (
        <p className="form-message form-message--error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="form-message form-message--success" role="status">
          <Check aria-hidden="true" size={16} /> {message}
        </p>
      )}

      <section className="panel profile-hero">
        <div className="profile-avatar-wrap">
          <span className="profile-avatar profile-avatar--large">
            {data.avatarUrl ? <img alt="" src={data.avatarUrl} /> : initials(data.displayName)}
          </span>
          <button
            aria-label="Upload avatar"
            className="profile-avatar-action"
            disabled={avatarMutation.isPending}
            onClick={() => fileInput.current?.click()}
          >
            <Camera aria-hidden="true" size={17} />
          </button>
          <input
            accept="image/jpeg,image/png,image/webp"
            className="visually-hidden"
            ref={fileInput}
            type="file"
            onChange={(event) => void handleAvatar(event.target.files?.[0])}
          />
        </div>
        <div className="profile-identity">
          <h2>{data.displayName}</h2>
          <p>{data.email}</p>
          <div className="profile-tags">
            <span>{data.currentLevel?.cefr ?? 'Level pending'}</span>
            <span>{goalLabels[data.learningGoal ?? 'general']}</span>
          </div>
        </div>
        {data.avatarPath && (
          <button
            className="button button--ghost profile-remove-avatar"
            disabled={avatarMutation.isPending}
            onClick={() => void handleRemoveAvatar()}
          >
            <Trash2 aria-hidden="true" size={16} /> Remove photo
          </button>
        )}
      </section>

      {isEditing && (
        <form className="panel profile-edit-form" onSubmit={handleSubmit}>
          <div className="profile-section-heading">
            <div>
              <p className="eyebrow">Personal details</p>
              <h2>Edit profile</h2>
            </div>
          </div>
          <div className="profile-form-grid">
            <label>
              <span>Display name</span>
              <input
                autoComplete="name"
                maxLength={60}
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </label>
            <label>
              <span>Learning goal</span>
              <select
                value={learningGoal}
                onChange={(event) => setLearningGoal(event.target.value as LearningGoal)}
              >
                {Object.entries(goalLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="button-row profile-form-actions">
            <button
              className="button button--secondary"
              type="button"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </button>
            <button
              className="button button--primary"
              disabled={updateProfile.isPending}
              type="submit"
            >
              {updateProfile.isPending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      )}

      <section className="profile-stats-grid" aria-label="Learning statistics">
        <article>
          <span>Current level</span>
          <strong>{data.currentLevel?.cefr ?? '—'}</strong>
          <small>{data.currentLevel?.title ?? 'Complete onboarding'}</small>
        </article>
        <article>
          <span>Lessons completed</span>
          <strong>{summary?.lessonsCompleted ?? '—'}</strong>
          <small>{summary ? `${summary.lessonsTotal} in your course` : 'Loading progress'}</small>
        </article>
        <article>
          <span>Current streak</span>
          <strong>{summary ? `${summary.streak.currentDays}d` : '—'}</strong>
          <small>{summary ? `Best ${summary.streak.longestDays} days` : 'Loading progress'}</small>
        </article>
        <article>
          <span>Average accuracy</span>
          <strong>
            {summary?.averageAccuracy == null ? '—' : `${Math.round(summary.averageAccuracy)}%`}
          </strong>
          <small>Completed lessons</small>
        </article>
      </section>
    </div>
  )
}
