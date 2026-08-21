import { AlertCircle, BookOpen } from 'lucide-react'
import type { ReactNode } from 'react'

export function CourseLoadingState({ cards = 4 }: { cards?: number }) {
  return (
    <div aria-label="Loading course" className="course-loading" role="status">
      {Array.from({ length: cards }, (_, index) => (
        <div className="course-loading__card" key={index}>
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  )
}

export function CourseErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <section className="course-state" role="alert">
      <AlertCircle aria-hidden="true" />
      <h2>Course unavailable</h2>
      <p>We could not load this part of the course. Check your connection and try again.</p>
      <button className="button button--secondary" onClick={onRetry} type="button">
        Try again
      </button>
    </section>
  )
}

export function CourseEmptyState({
  action,
  description,
  title,
}: {
  action?: ReactNode
  description: string
  title: string
}) {
  return (
    <section className="course-state">
      <BookOpen aria-hidden="true" />
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </section>
  )
}
