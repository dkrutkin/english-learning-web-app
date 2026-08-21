export function LessonProgress({ current, total }: { current: number; total: number }) {
  return (
    <div
      aria-label={`Lesson progress ${current} of ${total}`}
      aria-valuemax={total}
      aria-valuemin={0}
      aria-valuenow={current}
      className="lesson-progress"
      role="progressbar"
    >
      <span style={{ width: `${(current / total) * 100}%` }} />
    </div>
  )
}
