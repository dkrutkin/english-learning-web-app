import type { CSSProperties } from 'react'

export function LevelOrbit({
  level = 'B1',
  completed = 4,
  total = 10,
  progress: explicitProgress,
}: {
  level?: string
  completed?: number
  total?: number
  progress?: number
}) {
  const progress = Math.max(
    0,
    Math.min(100, Math.round(explicitProgress ?? (total > 0 ? (completed / total) * 100 : 0))),
  )
  return (
    <div
      aria-label={`${level} level, ${progress}% complete`}
      className="level-orbit"
      role="img"
      style={{ '--orbit-progress': `${progress * 3.6}deg` } as CSSProperties}
    >
      <div className="level-orbit__center">
        <strong>{level}</strong>
        <span>{progress}% complete</span>
      </div>
    </div>
  )
}
