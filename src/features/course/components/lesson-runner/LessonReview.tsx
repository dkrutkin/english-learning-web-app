import { ArrowLeft, CheckCircle2, RotateCcw, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLessonReview } from '../../hooks/use-lesson-runner'

function formatAnswer(answer: unknown) {
  if (Array.isArray(answer)) return answer.map(String).join(' · ')
  if (answer && typeof answer === 'object') {
    return Object.entries(answer)
      .map(([left, right]) => `${left}: ${String(right)}`)
      .join(' · ')
  }
  if (typeof answer === 'string' || typeof answer === 'number') return String(answer)
  return 'No answer recorded'
}

export function LessonReview({
  lessonId,
  lessonTitle,
  levelSlug,
  moduleSlug,
}: {
  lessonId: string
  lessonTitle: string
  levelSlug: string
  moduleSlug: string
}) {
  const review = useLessonReview(lessonId)

  if (review.isPending) {
    return <div className="lesson-runner-loading">Loading your review</div>
  }
  if (review.isError) {
    return (
      <section className="lesson-review lesson-review--state">
        <h1>Review unavailable</h1>
        <p>Complete this lesson before reviewing its answers</p>
        <Link className="button button--secondary" to={`/app/learn/${levelSlug}/${moduleSlug}`}>
          Back to module
        </Link>
      </section>
    )
  }

  const mistakes = review.data.items.filter((item) => !item.isCorrect)
  return (
    <section className="lesson-review">
      <div className="lesson-review__header">
        <Link aria-label="Back to module" to={`/app/learn/${levelSlug}/${moduleSlug}`}>
          <ArrowLeft aria-hidden="true" />
        </Link>
        <div>
          <p className="eyebrow">Mistake review</p>
          <h1>{lessonTitle}</h1>
          <p>{Math.round(review.data.accuracyPercent)}% accuracy</p>
        </div>
      </div>

      {mistakes.length === 0 ? (
        <div className="lesson-review__complete">
          <CheckCircle2 aria-hidden="true" />
          <h2>No mistakes to review</h2>
          <p>You answered every graded exercise correctly</p>
        </div>
      ) : (
        <div className="answer-review">
          <div className="result-section-heading">
            <RotateCcw aria-hidden="true" />
            <h2>
              {mistakes.length === 1
                ? '1 mistake to review'
                : `${mistakes.length} mistakes to review`}
            </h2>
          </div>
          {mistakes.map((item) => (
            <article className="is-incorrect" key={item.blockId}>
              <div className="answer-review__status">
                <X aria-hidden="true" />
              </div>
              <div>
                <span>{item.skill}</span>
                <h3>{item.title}</h3>
                <dl>
                  <div>
                    <dt>Your answer</dt>
                    <dd>{formatAnswer(item.userAnswer)}</dd>
                  </div>
                  <div>
                    <dt>Correct answer</dt>
                    <dd>{formatAnswer(item.correctAnswer)}</dd>
                  </div>
                </dl>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="lesson-review__actions">
        <Link className="button button--primary" to={`/app/learn/${levelSlug}/${moduleSlug}`}>
          Back to module
        </Link>
      </div>
    </section>
  )
}
