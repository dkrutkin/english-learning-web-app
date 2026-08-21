import { CheckCircle2, CircleAlert, LoaderCircle } from 'lucide-react'
import type { LessonSaveStatus } from '../../hooks/use-lesson-autosave'

export function ProgressSaveStatus({ status }: { status: LessonSaveStatus }) {
  const Icon = ['saving', 'retrying'].includes(status)
    ? LoaderCircle
    : status === 'saved'
      ? CheckCircle2
      : CircleAlert
  const label =
    status === 'saving'
      ? 'Saving…'
      : status === 'saved'
        ? 'Progress saved'
        : status === 'offline'
          ? 'Offline · saved on this device'
          : status === 'retrying'
            ? "Progress couldn't be saved · retrying…"
            : 'Newer progress found'
  return (
    <span className={`save-status save-status--${status}`} role="status">
      <Icon aria-hidden="true" size={15} />
      {label}
    </span>
  )
}
