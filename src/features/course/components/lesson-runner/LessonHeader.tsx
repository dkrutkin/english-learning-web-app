import { Link } from 'react-router-dom'
import type { LessonSaveStatus } from '../../hooks/use-lesson-autosave'
import { ProgressSaveStatus } from './ProgressSaveStatus'

export function LessonHeader({
  exitTo,
  possibleScore,
  saveStatus,
  score,
}: {
  exitTo: string
  possibleScore: number
  saveStatus: LessonSaveStatus
  score: number
}) {
  return (
    <header className="lesson-header">
      <Link aria-label="Exit lesson" to={exitTo}>
        Exit
      </Link>
      <div className="lesson-header__stats">
        <span className="lesson-score">
          {score} / {possibleScore} points
        </span>
        <ProgressSaveStatus status={saveStatus} />
      </div>
    </header>
  )
}
