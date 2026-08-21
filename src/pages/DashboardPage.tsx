import { ArrowRight, BookOpen, Flame, Target } from 'lucide-react'
import { Link } from 'react-router-dom'
import { LevelOrbit } from '../components/progress/LevelOrbit'
import { useAuth } from '../features/auth/AuthProvider'
import { useRecommendedLesson } from '../features/course/hooks/use-course'

function ContinueLearningCard() {
  const recommended = useRecommendedLesson()

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
  const action = progress.status === 'in_progress' ? 'Continue lesson' : 'Start lesson'
  return (
    <article className="continue-card">
      <p className="eyebrow">Continue learning</p>
      <span className="muted-label">
        {level.cefr} · Module {module.orderIndex}
      </span>
      <h2>{lesson.title}</h2>
      <p>
        Lesson {lesson.orderIndex} · About {lesson.estimatedMinutes} min
      </p>
      <div className="progress-line">
        <span style={{ width: `${progress.completionPercent}%` }} />
      </div>
      <span className="progress-caption">{progress.completionPercent}% complete</span>
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
  const displayName = user?.user_metadata.display_name ?? user?.email?.split('@')[0] ?? 'Learner'
  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1>Good afternoon, {displayName}</h1>
          <p>Ready for your next lesson?</p>
        </div>
      </header>
      <section className="dashboard-hero">
        <ContinueLearningCard />
        <article className="orbit-card">
          <p className="eyebrow">Current level</p>
          <LevelOrbit />
          <p>4 of 10 modules completed</p>
        </article>
      </section>
      <section className="stats-grid">
        <article>
          <Target />
          <div>
            <span>Weekly goal</span>
            <strong>3 of 5</strong>
            <small>2 lessons to go</small>
          </div>
        </article>
        <article>
          <Flame />
          <div>
            <span>Current streak</span>
            <strong>8 days</strong>
            <small>Keep your rhythm</small>
          </div>
        </article>
        <article>
          <BookOpen />
          <div>
            <span>Lessons completed</span>
            <strong>34</strong>
            <small>Across A2 and B1</small>
          </div>
        </article>
      </section>
      <section className="course-journey-card">
        <div>
          <p className="eyebrow">Your journey</p>
          <h2>One clear path to C1</h2>
        </div>
        <div className="course-journey">
          <span className="is-complete">
            A2 <small>Completed</small>
          </span>
          <i />
          <span className="is-current">
            B1 <small>42%</small>
          </span>
          <i />
          <span>
            B2 <small>Locked</small>
          </span>
          <i />
          <span>
            C1 <small>Locked</small>
          </span>
        </div>
      </section>
    </div>
  )
}
