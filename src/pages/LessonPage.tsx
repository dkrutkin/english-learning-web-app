import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

export function LessonPage() {
  const { lessonSlug } = useParams()
  const title = lessonSlug?.replaceAll('-', ' ') ?? 'Lesson'
  return (
    <main className="lesson-page">
      <header className="lesson-header">
        <Link aria-label="Exit lesson" to="/app/home">
          <ArrowLeft size={20} /> Exit
        </Link>
        <span>Lesson 4 of 6</span>
      </header>
      <div className="lesson-progress">
        <span style={{ width: '12%' }} />
      </div>
      <section className="lesson-content">
        <p className="eyebrow">Grammar & Communication</p>
        <h1 className="capitalize">{title}</h1>
        <p>Learn how to talk about experiences without focusing on a specific time.</p>
        <div className="lesson-example">
          <span>Structure</span>
          <strong>have / has + past participle</strong>
          <p>I have visited Italy.</p>
        </div>
        <button className="button button--primary button--large button--full" type="button">
          Continue
        </button>
      </section>
    </main>
  )
}
