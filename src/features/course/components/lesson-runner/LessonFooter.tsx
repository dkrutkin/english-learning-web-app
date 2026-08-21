import { ChevronRight, Lightbulb } from 'lucide-react'

export function LessonFooter({
  canUseHint,
  disabled,
  hint,
  hintVisible,
  label,
  onHint,
  onPrimary,
  step,
  total,
}: {
  canUseHint: boolean
  disabled: boolean
  hint: string
  hintVisible: boolean
  label: string
  onHint: () => void
  onPrimary: () => void
  step: number
  total: number
}) {
  return (
    <footer className="lesson-footer">
      {hintVisible ? (
        <div className="lesson-hint" role="note">
          <Lightbulb aria-hidden="true" />
          <div>
            <strong>Hint</strong>
            <span>{hint}</span>
          </div>
        </div>
      ) : null}
      <div className="lesson-footer__actions">
        {canUseHint ? (
          <button className="button button--secondary" onClick={onHint} type="button">
            <Lightbulb size={17} /> Show hint
          </button>
        ) : (
          <span />
        )}
        <button
          className="button button--primary button--large"
          disabled={disabled}
          onClick={onPrimary}
          type="button"
        >
          {label} <ChevronRight size={18} />
        </button>
      </div>
      <span className="lesson-runner__step">
        {step} of {total}
      </span>
    </footer>
  )
}
