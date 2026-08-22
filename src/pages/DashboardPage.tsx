import { ArrowRight, BookOpen, Flame, Target } from 'lucide-react'
import { Link } from 'react-router-dom'
import { LevelOrbit } from '../components/progress/LevelOrbit'
import { useAuth } from '../features/auth/AuthProvider'
import {
  useCourseLevels,
  useProgressSummary,
  useRecommendedLesson,
  useUserCourseProfile,
} from '../features/course/hooks/use-course'

function dayLabel(value: number) {
  return `${value} ${value === 1 ? 'day' : 'days'}`
}

function greetingForCurrentTime() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function weekdayLabel(value: string) {
  return new Intl.DateTimeFormat('en', { weekday: 'short', timeZone: 'UTC' }).format(
    new Date(`${value}T00:00:00Z`),
  )
}

function ContinueLearningCard() {
  const recommended = useRecommendedLesson()
  const summary = useProgressSummary()

  if (recommended.isPending) {
    return (
      <article
        aria-label="Loading recommended lesson"
        className="continue-card continue-card--loading"
      >
        <span />
        <span />
        <span />
      </article>
    )
  }
  if (recommended.isError) {
    return (
      <article className="continue-card">
        <p className="eyebrow">Continue learning</p>
        <h2>Lesson unavailable</h2>
        <p>We could not find your next lesson</p>
        <button
          className="button button--secondary"
          onClick={() => void recommended.refetch()}
          type="button"
        >
          Try again
        </button>
      </article>
    )
  }
  if (!recommended.data) {
    return (
      <article className="continue-card">
        <p className="eyebrow">Continue learning</p>
        <h2>Your next lesson is coming soon</h2>
        <p>Explore the published course while new lessons are being prepared</p>
        <Link className="button button--secondary" to="/app/learn">
          Explore the course
        </Link>
      </article>
    )
  }

  const { lesson, level, module, progress } = recommended.data
  const moduleProgress = summary.data?.courseProgress.modules.find(
    (entry) => entry.entityId === module.id,
  )
  const action = progress.status === 'in_progress' ? 'Continue lesson' : 'Start lesson'
  return (
    <article className="continue-card">
      <p className="eyebrow">Continue learning</p>
      <span className="muted-label">
        {level.cefr} · {module.title}
      </span>
      <h2>{lesson.title}</h2>
      <p>
        Lesson {lesson.orderIndex} · About {lesson.estimatedMinutes} min
      </p>
      <div className="progress-line">
        <span style={{ width: `${progress.completionPercent}%` }} />
      </div>
      <span className="progress-caption">{progress.completionPercent}% complete</span>
      <span className="continue-card__module-progress">
        Module {Math.round(moduleProgress?.completionPercent ?? 0)}% complete
      </span>
      <Link
        className="button button--primary"
        to={`/app/lesson/${level.slug}/${module.slug}/${lesson.slug}`}
      >
        {action} <ArrowRight size={17} />
      </Link>
    </article>
  )
}

export function DashboardPage() {
  const { user } = useAuth()
  const summary = useProgressSummary()
  const levels = useCourseLevels()
  const profile = useUserCourseProfile()
  const displayName =
    profile.data?.displayName ??
    user?.user_metadata.display_name ??
    user?.email?.split('@')[0] ??
    'Learner'
  const levelCodes = ['A2', 'B1', 'B2', 'C1'] as const
  const progressByLevel = new Map(
    (summary.data?.courseProgress.levels ?? []).map((entry) => [entry.entityId, entry]),
  )
  const levelByCode = new Map((levels.data ?? []).map((level) => [level.cefr, level]))

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1>
            {greetingForCurrentTime()}, {displayName}
          </h1>
          <p>Ready for your next lesson?</p>
        </div>
      </header>
      <section className="dashboard-hero">
        <ContinueLearningCard />
        <article className="orbit-card">
          <p className="eyebrow">Current level</p>
          <LevelOrbit
            level={summary.data?.currentLevel?.cefr ?? 'A2'}
            progress={summary.data?.currentLevel?.completionPercent ?? 0}
          />
          <p>
            {summary.isPending
              ? 'Loading progress'
              : `${summary.data?.currentLevel?.modulesCompleted ?? 0} of ${summary.data?.currentLevel?.modulesTotal ?? 0} modules completed`}
          </p>
        </article>
      </section>
      <section className="stats-grid">
        <article>
          <Target />
          <div>
            <span>Weekly goal</span>
            <strong>
              {summary.data?.weeklyGoal.completedDays ?? 0} of{' '}
              {summary.data?.weeklyGoal.targetDays ?? 5} days
            </strong>
            <small>
              {summary.data?.weeklyGoal.remainingDays
                ? `${dayLabel(summary.data.weeklyGoal.remainingDays)} to go`
                : 'Weekly goal complete'}
            </small>
          </div>
        </article>
        <article>
          <Flame />
          <div>
            <span>Current streak</span>
            <strong>{dayLabel(summary.data?.streak.currentDays ?? 0)}</strong>
            <small>Best: {dayLabel(summary.data?.streak.longestDays ?? 0)}</small>
          </div>
        </article>
        <article>
          <BookOpen />
          <div>
            <span>Lessons completed</span>
            <strong>{summary.data?.lessonsCompleted ?? 0}</strong>
            <small>{Math.round(summary.data?.averageAccuracy ?? 0)}% average accuracy</small>
          </div>
        </article>
      </section>
      <section className="dashboard-activity-card">
        <div>
          <p className="eyebrow">Weekly activity</p>
          <h2>Your last 7 days</h2>
          <span className="progress-caption">
            {dayLabel(summary.data?.weeklyGoal.completedDays ?? 0)} active this week
          </span>
        </div>
        <div className="weekly-activity" aria-label="Learning activity during the last 7 days">
          {(summary.data?.activity.slice(-7) ?? []).map((day) => (
            <div key={day.date}>
              <span
                aria-label={`${weekdayLabel(day.date)}: ${day.minutesActive} minutes`}
                style={{ height: `${Math.max(8, day.intensity * 18)}px` }}
                title={`${day.minutesActive} min · ${day.lessonsCompleted} lessons`}
              />
              <small>{weekdayLabel(day.date)}</small>
            </div>
          ))}
        </div>
      </section>
      <section className="course-journey-card">
        <div>
          <p className="eyebrow">Your journey</p>
          <h2>One clear path to C1</h2>
          <span className="progress-caption">
            {Math.round(summary.data?.overallProgress ?? 0)}% of the full course complete
          </span>
        </div>
        <div className="course-journey">
          {levelCodes.map((code, index) => {
            const level = levelByCode.get(code)
            const progress = level ? progressByLevel.get(level.id) : null
            const isComplete = progress?.status === 'completed' || progress?.status === 'mastered'
            const isCurrent = summary.data?.currentLevel?.cefr === code
            return (
              <div className="course-journey__step" key={code}>
                <span className={isComplete ? 'is-complete' : isCurrent ? 'is-current' : ''}>
                  {code}{' '}
                  <small>
                    {isComplete
                      ? progress.status === 'mastered'
                        ? 'Mastered'
                        : 'Completed'
                      : isCurrent
                        ? `${Math.round(progress?.completionPercent ?? 0)}%`
                        : 'Locked'}
                  </small>
                </span>
                {index < levelCodes.length - 1 ? <i /> : null}
              </div>
            )
          })}
        </div>
      </section>
      {summary.isError || levels.isError || profile.isError ? (
        <button
          className="button button--secondary dashboard-progress-retry"
          onClick={() => void Promise.all([summary.refetch(), levels.refetch(), profile.refetch()])}
          type="button"
        >
          Refresh progress
        </button>
      ) : null}
    </div>
  )
}
