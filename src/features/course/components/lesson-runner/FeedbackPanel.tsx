import { CheckCircle2, CircleAlert } from 'lucide-react'
import type { AnswerResult } from '../../types/course'
import { MAX_ATTEMPTS } from './runner-utils'

export function FeedbackPanel({ feedback }: { feedback: AnswerResult }) {
  return (
    <div className={`answer-feedback ${feedback.isCorrect ? 'is-correct' : 'is-incorrect'}`}>
      {feedback.isCorrect ? (
        <CheckCircle2 aria-hidden="true" />
      ) : (
        <CircleAlert aria-hidden="true" />
      )}
      <div>
        <strong>{feedback.isCorrect ? 'Correct' : 'Not quite yet'}</strong>
        <span>
          {feedback.score} of {feedback.maxScore} points · attempt {feedback.attemptNumber} of{' '}
          {MAX_ATTEMPTS}
          {feedback.usedHint ? ' · hint used' : ''}
        </span>
      </div>
    </div>
  )
}
