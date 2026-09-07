import {
  Award,
  BookOpen,
  CheckCircle2,
  Flame,
  LockKeyhole,
  Medal,
  Sparkles,
  Target,
  Trophy,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { CourseErrorState, CourseLoadingState } from '../features/course/components/CourseStates'
import { useAchievementsOverview } from '../features/course/hooks/use-course'
import type { AchievementsOverview } from '../features/course/types/course'

type Achievement = AchievementsOverview['achievements'][number]
const achievementIcons = {
  sparkles: Sparkles,
  'book-open': BookOpen,
  'check-circle': CheckCircle2,
  flame: Flame,
  target: Target,
  award: Award,
} as const

function formatDate(value: string | null) {
  if (!value) return 'Not unlocked yet'
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(value),
  )
}

export function AchievementDetailModal({
  achievement,
  onClose,
}: {
  achievement: Achievement
  onClose: () => void
}) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])
  const Icon = achievementIcons[achievement.icon as keyof typeof achievementIcons] ?? Award
  return (
    <div className="achievement-modal" onMouseDown={onClose} role="presentation">
      <section
        aria-labelledby="achievement-detail-title"
        aria-modal="true"
        className="achievement-modal__card"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <button autoFocus aria-label="Close achievement details" onClick={onClose} type="button">
          <X aria-hidden="true" />
        </button>
        <span className="achievement-modal__icon">
          <Icon aria-hidden="true" />
        </span>
        <p className="eyebrow">{achievement.category}</p>
        <h2 id="achievement-detail-title">{achievement.title}</h2>
        <p>{achievement.description}</p>
        <div className="achievement-detail-progress">
          <div className="progress-track">
            <span style={{ width: `${achievement.progressPercent}%` }} />
          </div>
          <strong>
            {achievement.currentValue} / {achievement.targetValue}
          </strong>
        </div>
        <small>
          {achievement.unlocked ? `Unlocked ${formatDate(achievement.unlockedAt)}` : 'Locked'}
        </small>
      </section>
    </div>
  )
}

export function AchievementsPage() {
  const overview = useAchievementsOverview()
  const [selected, setSelected] = useState<Achievement | null>(null)
  if (overview.isPending)
    return (
      <div className="page-container">
        <CourseLoadingState cards={6} />
      </div>
    )
  if (overview.isError)
    return (
      <div className="page-container">
        <CourseErrorState onRetry={() => void overview.refetch()} />
      </div>
    )

  const { achievements, levelEmblems, moduleSeals, timeline } = overview.data
  const unlockedCount = achievements.filter(({ unlocked }) => unlocked).length
  return (
    <div className="page-container achievements-page">
      <header className="page-header achievements-header">
        <div>
          <p className="eyebrow">Learning milestones</p>
          <h1>Achievements</h1>
          <p>Every milestone marks real progress in your English journey</p>
        </div>
        <div className="achievement-count" aria-label={`${unlockedCount} achievements unlocked`}>
          <Trophy aria-hidden="true" />
          <strong>{unlockedCount}</strong>
          <span>of {achievements.length} unlocked</span>
        </div>
      </header>

      <section aria-labelledby="achievements-title">
        <div className="section-heading">
          <h2 id="achievements-title">Your achievements</h2>
          <span>
            {Math.round((unlockedCount / Math.max(achievements.length, 1)) * 100)}% complete
          </span>
        </div>
        <div className="achievement-grid">
          {achievements.map((achievement) => {
            const Icon =
              achievementIcons[achievement.icon as keyof typeof achievementIcons] ?? Award
            return (
              <button
                className={`achievement-card ${achievement.unlocked ? 'is-unlocked' : 'is-locked'}`}
                key={achievement.id}
                onClick={() => setSelected(achievement)}
                type="button"
              >
                <span className="achievement-icon">
                  {achievement.unlocked ? (
                    <Icon aria-hidden="true" />
                  ) : (
                    <LockKeyhole aria-hidden="true" />
                  )}
                </span>
                <span className="achievement-card__content">
                  <span className="achievement-card__meta">
                    {achievement.category}
                    <small>
                      {achievement.unlocked
                        ? 'Unlocked'
                        : `${Math.round(achievement.progressPercent)}%`}
                    </small>
                  </span>
                  <strong>{achievement.title}</strong>
                  <span>{achievement.description}</span>
                  <span className="progress-track">
                    <i style={{ width: `${achievement.progressPercent}%` }} />
                  </span>
                  <small>
                    {achievement.unlocked
                      ? formatDate(achievement.unlockedAt)
                      : `${achievement.currentValue} of ${achievement.targetValue}`}
                  </small>
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="achievement-awards" aria-label="Course awards">
        <article className="panel">
          <div className="achievement-awards__heading">
            <Medal aria-hidden="true" />
            <div>
              <h2>Module Seals</h2>
              <p>Earned by completing a full module</p>
            </div>
          </div>
          {moduleSeals.length ? (
            <div className="award-list">
              {moduleSeals.map((seal) => (
                <div key={seal.id}>
                  <span>{seal.level}</span>
                  <div>
                    <strong>{seal.title}</strong>
                    <small>
                      {seal.status === 'mastered' ? 'Mastered' : 'Completed'} ·{' '}
                      {formatDate(seal.awardedAt)}
                    </small>
                  </div>
                  {seal.score !== null ? <b>{Math.round(seal.score)}%</b> : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-award">Your first seal will appear after completing a module</p>
          )}
        </article>
        <article className="panel">
          <div className="achievement-awards__heading">
            <Trophy aria-hidden="true" />
            <div>
              <h2>Level Emblems</h2>
              <p>Earned by completing a CEFR level</p>
            </div>
          </div>
          {levelEmblems.length ? (
            <div className="award-list">
              {levelEmblems.map((emblem) => (
                <div key={emblem.id}>
                  <span>{emblem.level}</span>
                  <div>
                    <strong>{emblem.title}</strong>
                    <small>
                      {emblem.status === 'mastered' ? 'Mastered' : 'Completed'} ·{' '}
                      {formatDate(emblem.awardedAt)}
                    </small>
                  </div>
                  {emblem.score !== null ? <b>{Math.round(emblem.score)}%</b> : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-award">Your first emblem will appear after completing a level</p>
          )}
        </article>
      </section>

      <section className="panel achievement-timeline" aria-labelledby="timeline-title">
        <div className="section-heading">
          <h2 id="timeline-title">Milestone timeline</h2>
        </div>
        {timeline.length ? (
          <div>
            {timeline.map((item) => (
              <article key={`${item.type}-${item.id}`}>
                <span>
                  {item.type === 'achievement' ? (
                    <Sparkles />
                  ) : item.type === 'module_seal' ? (
                    <Medal />
                  ) : (
                    <Trophy />
                  )}
                </span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.subtitle}</p>
                </div>
                <time dateTime={item.occurredAt}>{formatDate(item.occurredAt)}</time>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-award">Complete your first lesson to start the timeline</p>
        )}
      </section>
      {selected ? (
        <AchievementDetailModal achievement={selected} onClose={() => setSelected(null)} />
      ) : null}
    </div>
  )
}
