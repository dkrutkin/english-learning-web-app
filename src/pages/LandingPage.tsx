import { ArrowRight, BookOpen, ChartNoAxesCombined, Headphones } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ThemeToggle } from '../components/theme/ThemeToggle'

const benefits = [
  {
    icon: BookOpen,
    title: 'Learn',
    text: 'Build grammar, vocabulary and communication skills through focused lessons.',
  },
  {
    icon: Headphones,
    title: 'Practice',
    text: 'Use what you learn through reading, listening, writing and speaking tasks.',
  },
  {
    icon: ChartNoAxesCombined,
    title: 'Progress',
    text: 'See exactly where you are and what to work on next.',
  },
]

export function LandingPage() {
  return (
    <div className="marketing-page">
      <header className="marketing-header">
        <Link className="brand" to="/">
          <span>Fluent</span>
        </Link>
        <div className="header-actions">
          <ThemeToggle compact />
          <Link className="button button--ghost" to="/login">
            Sign in
          </Link>
          <Link className="button button--primary header-cta" to="/signup">
            Start learning
          </Link>
        </div>
      </header>
      <main>
        <section className="hero-section">
          <div className="hero-copy">
            <p className="eyebrow">English from A2 to C1</p>
            <h1>Build English you can actually use</h1>
            <p className="hero-description">
              Structured lessons, practical exercises and clear progress from A2 to C1.
            </p>
            <div className="button-row">
              <Link className="button button--primary button--large" to="/signup">
                Start learning <ArrowRight size={18} />
              </Link>
              <Link className="button button--secondary button--large" to="/app/learn">
                Explore the course
              </Link>
            </div>
          </div>
        </section>
        <section className="content-section">
          <p className="eyebrow">How it works</p>
          <h2>A clear path to better English</h2>
          <div className="benefit-grid">
            {benefits.map(({ icon: Icon, title, text }) => (
              <article className="feature-card" key={title}>
                <span className="feature-icon">
                  <Icon size={22} />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
      <footer className="marketing-footer">
        <span>© 2026 Fluent</span>
        <div>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
        </div>
      </footer>
    </div>
  )
}
