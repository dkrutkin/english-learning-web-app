import { ArrowRight, Check, Clock3, LockKeyhole } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { LessonWithProgress, LevelWithProgress, ModuleWithProgress } from '../types/course'
import { formatMinutes, progressLabels } from '../utils/course'

function StatusIcon({ status }: { status: LevelWithProgress['progress']['status'] }) {
  if (status === 'locked') return <LockKeyhole size={14} />
  if (status === 'completed' || status === 'mastered') return <Check size={14} />
  return null
}

export function LevelCard({ level }: { level: LevelWithProgress }) {
  const content = (
    <article className={`level-card${level.progress.status === 'locked' ? 'is-locked' : ''}`}>
      <div className="level-card__top">
        <span className="level-code">{level.cefr}</span>
        <span className="status-pill">
          <StatusIcon status={level.progress.status} />
          {progressLabels[level.progress.status]}
        </span>
      </div>
      <h2>{level.title}</h2>
      <p>{level.description}</p>
      <div className="progress-line">
        <span style={{ width: `${level.progress.completionPercent}%` }} />
      </div>
      <small>{level.progress.completionPercent}% complete</small>
    </article>
  )

  return level.progress.status === 'locked' ? (
    content
  ) : (
    <Link to={`/app/learn/${level.slug}`}>{content}</Link>
  )
}

export function ModuleCard({
  levelSlug,
  module,
}: {
  levelSlug: string
  module: ModuleWithProgress
}) {
  const content = (
    <article className={`course-card${module.progress.status === 'locked' ? 'is-locked' : ''}`}>
      <div className="course-card__meta">
        <span>Module {module.orderIndex}</span>
        <span>
          <Clock3 size={14} /> {formatMinutes(module.estimatedMinutes)}
        </span>
      </div>
      <h2>{module.title}</h2>
      <p>{module.description}</p>
      <strong>{module.learningOutcome}</strong>
      <div className="course-card__footer">
        <span className="status-pill">
          <StatusIcon status={module.progress.status} />
          {progressLabels[module.progress.status]}
        </span>
        {module.progress.status !== 'locked' && <ArrowRight size={18} />}
      </div>
    </article>
  )

  return module.progress.status === 'locked' ? (
    content
  ) : (
    <Link to={`/app/learn/${levelSlug}/${module.slug}`}>{content}</Link>
  )
}

export function LessonCard({
  lesson,
  levelSlug,
  moduleSlug,
  locked = false,
}: {
  lesson: LessonWithProgress
  levelSlug: string
  moduleSlug: string
  locked?: boolean
}) {
  const content = (
    <article className={`lesson-card${locked ? 'is-locked' : ''}`}>
      <span className="lesson-card__number">
        {locked ? <LockKeyhole aria-label="Locked" size={16} /> : lesson.orderIndex}
      </span>
      <div>
        <div className="course-card__meta">
          <span>
            {lesson.slug === 'level-assessment'
              ? locked
                ? 'Complete all modules first'
                : 'Level assessment'
              : lesson.slug === 'module-review'
                ? 'Module review'
                : progressLabels[lesson.progress.status]}
          </span>
          <span>
            <Clock3 size={14} /> {formatMinutes(lesson.estimatedMinutes)}
          </span>
        </div>
        <h2>{lesson.title}</h2>
        <p>{lesson.description}</p>
        <div className="progress-line">
          <span style={{ width: `${lesson.progress.completionPercent}%` }} />
        </div>
      </div>
      {!locked ? <ArrowRight aria-hidden="true" size={20} /> : null}
    </article>
  )

  return locked ? (
    content
  ) : (
    <Link to={`/app/lesson/${levelSlug}/${moduleSlug}/${lesson.slug}`}>{content}</Link>
  )
}
