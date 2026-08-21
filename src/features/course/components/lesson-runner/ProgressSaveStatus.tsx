import { CheckCircle2, CircleAlert, LoaderCircle } from 'lucide-react'

export function ProgressSaveStatus({ status }: { status: 'saving' | 'saved' | 'error' }) {
  const Icon = status === 'saving' ? LoaderCircle : status === 'saved' ? CheckCircle2 : CircleAlert
  const label =
    status === 'saving' ? 'Saving' : status === 'saved' ? 'Progress saved' : 'Save failed'
  return (
    <span className={`save-status save-status--${status}`} role="status">
      <Icon aria-hidden="true" size={15} />
      {label}
    </span>
  )
}
