import {
  Award,
  Check,
  CheckCircle2,
  ChevronRight,
  Medal,
  RotateCcw,
  Target,
  Trophy,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { LessonResult as LessonResultType } from '../../types/course'

type ReviewMode = 'hidden' | 'mistakes' | 'all'

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

function CompletionAward({ result }: { result: LessonResultType }) {
  if (result.levelCompleted) {
    return (
      <div className="completion-award completion-award--level">
        <Trophy aria-hidden="true" />
        <div>
          <span>Level Emblem</span>
          <strong>{result.levelMastered ? 'Level mastered' : 'Level complete'}</strong>
          <small>Your next English level is now available</small>
        </div>
      </div>
    )
  }
  if (result.moduleCompleted) {
    return (
      <div className="completion-award">
        <Medal aria-hidden="true" />
        <div>
          <span>Module Seal</span>
          <strong>{result.moduleMastered ? 'Module mastered' : 'Module complete'}</strong>
          <small>
            {result.moduleMastered
              ? 'You reached the mastery target'
              : 'Complete the assessment with 85% to master it'}
          </small>
        </div>
      </div>
    )
  }
  return null
}

export function LessonResult({
  levelSlug,
  moduleSlug,
  result,
}: {
  levelSlug: string
  moduleSlug: string
  result: LessonResultType
}) {
  const [reviewMode, setReviewMode] = useState<ReviewMode>('hidden')
  const mistakes = result.answerReview.filter((item) => !item.isCorrect)
  const reviewItems = reviewMode === 'mistakes' ? mistakes : result.answerReview
  const isAssessment = result.lessonKind !== 'lesson'
  const title = result.levelCompleted
    ? result.levelMastered
      ? 'Level mastered'
      : 'Level complete'
    : result.moduleCompleted
      ? result.moduleMastered
        ? 'Module mastered'
        : 'Module complete'
      : isAssessment
        ? 'Assessment complete'
        : 'Great work'

  const primaryAction = result.nextLesson ? (
    <Link
      className="button button--primary button--large"
      to={`/app/lesson/${levelSlug}/${moduleSlug}/${result.nextLesson.slug}`}
    >
      Next lesson <ChevronRight size={18} />
    </Link>
  ) : result.nextModule ? (
    <Link
      className="button button--primary button--large"
      to={`/app/learn/${levelSlug}/${result.nextModule.slug}`}
    >
      Open next module <ChevronRight size={18} />
    </Link>
  ) : result.nextLevel ? (
    <Link
      className="button button--primary button--large"
      to={`/app/learn/${result.nextLevel.slug}`}
    >
      Open next level <ChevronRight size={18} />
    </Link>
  ) : (
    <Link className="button button--primary button--large" to={`/app/learn/${levelSlug}`}>
      Continue learning <ChevronRight size={18} />
    </Link>
  )

  return (
    <section className="lesson-result">
      <CheckCircle2 aria-hidden="true" className="lesson-result__check" />
      <p className="eyebrow">{isAssessment ? 'Assessment result' : 'Lesson complete'}</p>
      <h1>{title}</h1>
      <p>Your answers and progress have been saved</p>

      <CompletionAward result={result} />

      <div className="lesson-result__stats">
        <article>
          <strong>
            {result.score}/{result.possibleScore}
          </strong>
          <span>Score</span>
        </article>
        <article>
          <strong>{Math.round(result.accuracyPercent)}%</strong>
          <span>Accuracy</span>
        </article>
        <article>
          <strong>{result.answerReview.length - mistakes.length}</strong>
          <span>Correct</span>
        </article>
        <article>
          <strong>{mistakes.length}</strong>
          <span>To review</span>
        </article>
      </div>

      {result.skillBreakdown.length > 0 ? (
        <div className="skill-results" aria-label="Skill breakdown">
          <div className="result-section-heading">
            <Target aria-hidden="true" />
            <h2>Skills</h2>
          </div>
          <div className="skill-results__grid">
            {result.skillBreakdown.map((skill) => (
              <article key={skill.skill}>
                <div>
                  <strong>{skill.skill}</strong>
                  <span>{Math.round(skill.accuracyPercent)}%</span>
                </div>
                <div className="progress-line">
                  <span style={{ width: `${skill.accuracyPercent}%` }} />
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {result.answerReview.length > 0 ? (
        <div className="result-review-actions">
          {mistakes.length > 0 ? (
            <button
              className="button button--secondary"
              onClick={() => setReviewMode(reviewMode === 'mistakes' ? 'hidden' : 'mistakes')}
              type="button"
            >
              <RotateCcw size={17} /> Review mistakes
            </button>
          ) : null}
          <button
            className="button button--ghost"
            onClick={() => setReviewMode(reviewMode === 'all' ? 'hidden' : 'all')}
            type="button"
          >
            Review all answers
          </button>
        </div>
      ) : null}

      {reviewMode !== 'hidden' ? (
        <div className="answer-review" aria-live="polite">
          <div className="result-section-heading">
            <RotateCcw aria-hidden="true" />
            <h2>{reviewMode === 'mistakes' ? 'Mistakes to review' : 'Answer review'}</h2>
          </div>
          {reviewItems.map((item) => (
            <article className={item.isCorrect ? 'is-correct' : 'is-incorrect'} key={item.blockId}>
              <div className="answer-review__status">
                {item.isCorrect ? <Check aria-hidden="true" /> : <X aria-hidden="true" />}
              </div>
              <div>
                <span>{item.skill}</span>
                <h3>{item.title}</h3>
                <dl>
                  <div>
                    <dt>Your answer</dt>
                    <dd>{formatAnswer(item.userAnswer)}</dd>
                  </div>
                  {!item.isCorrect ? (
                    <div>
                      <dt>Correct answer</dt>
                      <dd>{formatAnswer(item.correctAnswer)}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            </article>
          ))}
        </div>
      ) : null}

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

      <div className="lesson-result__actions">
        {primaryAction}
        <Link className="button button--ghost" to={`/app/learn/${levelSlug}/${moduleSlug}`}>
          Back to module
        </Link>
      </div>
    </section>
  )
}
