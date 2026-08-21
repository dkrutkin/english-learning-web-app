import { Check, LockKeyhole } from 'lucide-react'
import { useParams } from 'react-router-dom'

const levels = [
  {
    cefr: 'A2',
    title: 'Foundations',
    description: 'Build essential grammar, vocabulary and everyday communication skills.',
    status: 'Completed',
    progress: 100,
  },
  {
    cefr: 'B1',
    title: 'Independent English',
    description: 'Communicate confidently about work, travel, experiences and everyday life.',
    status: 'In progress',
    progress: 42,
  },
  {
    cefr: 'B2',
    title: 'Confident English',
    description: 'Handle complex conversations, professional situations and detailed ideas.',
    status: 'Locked',
    progress: 0,
  },
  {
    cefr: 'C1',
    title: 'Advanced English',
    description: 'Understand nuance and express complex ideas naturally and precisely.',
    status: 'Locked',
    progress: 0,
  },
]

export function LearnPage() {
  const { levelSlug, moduleSlug } = useParams()
  const title = moduleSlug
    ? moduleSlug.replaceAll('-', ' ')
    : levelSlug
      ? `${levelSlug.toUpperCase()} level`
      : 'Learn'
  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <p className="eyebrow">
            {moduleSlug ? `${levelSlug?.toUpperCase()} · Module` : 'Course roadmap'}
          </p>
          <h1 className="capitalize">{title}</h1>
          <p>Follow your path from A2 to C1.</p>
        </div>
      </header>
      <section className="level-grid">
        {levels.map((level) => (
          <article
            className={`level-card${level.status === 'Locked' ? 'is-locked' : ''}`}
            key={level.cefr}
          >
            <div className="level-card__top">
              <span className="level-code">{level.cefr}</span>
              <span className="status-pill">
                {level.status === 'Completed' && <Check size={14} />}
                {level.status === 'Locked' && <LockKeyhole size={14} />}
                {level.status}
              </span>
            </div>
            <h2>{level.title}</h2>
            <p>{level.description}</p>
            <div className="progress-line">
              <span style={{ width: `${level.progress}%` }} />
            </div>
            <small>{level.progress}% complete</small>
          </article>
        ))}
      </section>
    </div>
  )
}
