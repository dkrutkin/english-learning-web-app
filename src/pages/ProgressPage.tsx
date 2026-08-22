import { Award, CalendarDays, Flame, Target, Trophy } from 'lucide-react'
import { LevelOrbit } from '../components/progress/LevelOrbit'
import { CourseErrorState, CourseLoadingState } from '../features/course/components/CourseStates'
import { useProgressSummary } from '../features/course/hooks/use-course'

function formatActivityDate(value: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(
    new Date(`${value}T00:00:00Z`),
  )
}

function lessonLabel(value: number) {
  return `${value} ${value === 1 ? 'lesson' : 'lessons'}`
}

function dayLabel(value: number) {
  return `${value} ${value === 1 ? 'day' : 'days'}`
}

function minuteLabel(value: number) {
  return `${value} ${value === 1 ? 'minute' : 'minutes'}`
}

export function ProgressPage() {
  const summary = useProgressSummary()

  if (summary.isPending) {
    return (
      <div className="page-container">
        <CourseLoadingState cards={4} />
      </div>
    )
  }
  if (summary.isError) {
    return (
      <div className="page-container">
        <CourseErrorState onRetry={() => void summary.refetch()} />
      </div>
    )
  }

  const progress = summary.data
  const measuredSkills = progress.skills.filter((skill) => skill.attempts > 0)

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1>Progress</h1>
          <p>See what you have achieved and where to focus next</p>
        </div>
      </header>

      <section className="progress-summary-grid">
        <article>
          <Trophy aria-hidden="true" />
          <span>Overall progress</span>
          <strong>{Math.round(progress.overallProgress)}%</strong>
          <small>A2 to C1 learning path</small>
        </article>
        <article>
          <Target aria-hidden="true" />
          <span>Average accuracy</span>
          <strong>{Math.round(progress.averageAccuracy ?? 0)}%</strong>
          <small>{lessonLabel(progress.lessonsCompleted)} completed</small>
        </article>
        <article>
          <CalendarDays aria-hidden="true" />
          <span>Weekly goal</span>
          <strong>
            {progress.weeklyGoal.completedDays}/{progress.weeklyGoal.targetDays}
          </strong>
          <small>Active study days</small>
        </article>
        <article>
          <Flame aria-hidden="true" />
          <span>Current streak</span>
          <strong>{progress.streak.currentDays}</strong>
          <small>Best: {dayLabel(progress.streak.longestDays)}</small>
        </article>
      </section>

      <section className="two-column-grid progress-main-grid">
        <article className="panel panel--center">
          <p className="eyebrow">Current level</p>
          <LevelOrbit
            level={progress.currentLevel?.cefr ?? 'A2'}
            progress={progress.currentLevel?.completionPercent ?? 0}
          />
          <p className="panel-note">
            {progress.currentLevel
              ? `${progress.currentLevel.modulesCompleted} of ${progress.currentLevel.modulesTotal} modules completed`
              : 'Your current level will appear here'}
          </p>
        </article>
        <article className="panel">
          <p className="eyebrow">Skill performance</p>
          <h2>Your learning profile</h2>
          {measuredSkills.length > 0 ? (
            <div className="skill-list">
              {measuredSkills.map((skill) => (
                <div key={skill.slug}>
                  <span>{skill.name}</span>
                  <div className="progress-line">
                    <span style={{ width: `${skill.performancePercent ?? 0}%` }} />
                  </div>
                  <strong>{Math.round(skill.performancePercent ?? 0)}%</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="progress-empty-copy">
              Complete graded exercises to build your skill profile
            </p>
          )}
          <p className="panel-note">
            Performance reflects activities inside Fluent, not an official CEFR certification
          </p>
        </article>
      </section>

      <section className="panel activity-panel">
        <div className="progress-section-heading">
          <div>
            <p className="eyebrow">Activity</p>
            <h2>Last 12 weeks</h2>
          </div>
          <span>{dayLabel(progress.weeklyGoal.completedDays)} active this week</span>
        </div>
        <div className="activity-heatmap" role="img" aria-label="Learning activity over 12 weeks">
          {progress.activity.map((day) => (
            <span
              aria-label={`${formatActivityDate(day.date)}: ${minuteLabel(day.minutesActive)}, ${lessonLabel(day.lessonsCompleted)}`}
              className={`activity-day activity-day--${day.intensity}`}
              key={day.date}
              title={`${formatActivityDate(day.date)} · ${day.minutesActive} min · ${lessonLabel(day.lessonsCompleted)}`}
            />
          ))}
        </div>
        <div className="activity-legend" aria-hidden="true">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((intensity) => (
            <i className={`activity-day activity-day--${intensity}`} key={intensity} />
          ))}
          <span>More</span>
        </div>
      </section>

      <section className="panel milestone-panel">
        <div className="progress-section-heading">
          <div>
            <p className="eyebrow">Milestones</p>
            <h2>Your next achievements</h2>
          </div>
          <Award aria-hidden="true" />
        </div>
        <div className="milestone-list">
          {progress.milestones.map((milestone) => (
            <article className={milestone.unlocked ? 'is-unlocked' : ''} key={milestone.slug}>
              <div>
                <strong>{milestone.title}</strong>
                <span>{milestone.description}</span>
              </div>
              <div className="milestone-progress">
                <div className="progress-line">
                  <span style={{ width: `${milestone.progressPercent}%` }} />
                </div>
                <small>
                  {milestone.unlocked ? 'Unlocked' : `${Math.round(milestone.progressPercent)}%`}
                </small>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
