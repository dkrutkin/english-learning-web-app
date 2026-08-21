import { ArrowRight, BookOpen, Flame, Target } from 'lucide-react'
import { Link } from 'react-router-dom'
import { LevelOrbit } from '../components/progress/LevelOrbit'

export function DashboardPage() {
  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1>Good afternoon, Dmitry</h1>
          <p>Ready for your next lesson?</p>
        </div>
      </header>
      <section className="dashboard-hero">
        <article className="continue-card">
          <p className="eyebrow">Continue learning</p>
          <span className="muted-label">B1 · Module 3</span>
          <h2>Present Perfect</h2>
          <p>Lesson 4 of 6 · About 18 min</p>
          <div className="progress-line">
            <span style={{ width: '62%' }} />
          </div>
          <span className="progress-caption">62% complete</span>
          <Link className="button button--primary" to="/app/lesson/present-perfect">
            Continue lesson <ArrowRight size={17} />
          </Link>
        </article>
        <article className="orbit-card">
          <p className="eyebrow">Current level</p>
          <LevelOrbit />
          <p>4 of 10 modules completed</p>
        </article>
      </section>
      <section className="stats-grid">
        <article>
          <Target />
          <div>
            <span>Weekly goal</span>
            <strong>3 of 5</strong>
            <small>2 lessons to go</small>
          </div>
        </article>
        <article>
          <Flame />
          <div>
            <span>Current streak</span>
            <strong>8 days</strong>
            <small>Keep your rhythm</small>
          </div>
        </article>
        <article>
          <BookOpen />
          <div>
            <span>Lessons completed</span>
            <strong>34</strong>
            <small>Across A2 and B1</small>
          </div>
        </article>
      </section>
      <section className="course-journey-card">
        <div>
          <p className="eyebrow">Your journey</p>
          <h2>One clear path to C1</h2>
        </div>
        <div className="course-journey">
          <span className="is-complete">
            A2 <small>Completed</small>
          </span>
          <i />
          <span className="is-current">
            B1 <small>42%</small>
          </span>
          <i />
          <span>
            B2 <small>Locked</small>
          </span>
          <i />
          <span>
            C1 <small>Locked</small>
          </span>
        </div>
      </section>
    </div>
  )
}
