import { Award, CheckCircle2, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { LessonResult as LessonResultType } from '../../types/course'

export function LessonResult({
  levelSlug,
  moduleSlug,
  result,
}: {
  levelSlug: string
  moduleSlug: string
  result: LessonResultType
}) {
  return (
    <section className="lesson-result">
      <CheckCircle2 aria-hidden="true" />
      <p className="eyebrow">Lesson complete</p>
      <h1>Great work</h1>
      <p>You completed the lesson and saved your progress</p>
      <div className="lesson-result__stats">
        <article>
          <strong>{Math.round(result.accuracyPercent)}%</strong>
          <span>Accuracy</span>
        </article>
        <article>
          <strong>{Math.round(result.moduleCompletionPercent)}%</strong>
          <span>Module</span>
        </article>
      </div>
      {result.unlockedAchievements.length > 0 ? (
        <div className="achievement-unlocked">
          <Award aria-hidden="true" />
          <div>
            <strong>Achievement unlocked</strong>
            <span>
              {result.unlockedAchievements.map((slug) => slug.replaceAll('-', ' ')).join(', ')}
            </span>
          </div>
        </div>
      ) : null}
      <Link
        className="button button--primary button--large"
        to={`/app/learn/${levelSlug}/${moduleSlug}`}
      >
        Back to module <ChevronRight size={18} />
      </Link>
    </section>
  )
}
