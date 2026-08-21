import { LevelOrbit } from '../components/progress/LevelOrbit'
const skills = [
  ['Vocabulary', 82],
  ['Grammar', 74],
  ['Reading', 91],
  ['Listening', 64],
  ['Writing', 71],
] as const

export function ProgressPage() {
  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1>Progress</h1>
          <p>See what you have achieved and where to focus next.</p>
        </div>
      </header>
      <section className="two-column-grid">
        <article className="panel panel--center">
          <p className="eyebrow">Current level</p>
          <LevelOrbit />
        </article>
        <article className="panel">
          <p className="eyebrow">Skill performance</p>
          <h2>Your learning profile</h2>
          <div className="skill-list">
            {skills.map(([skill, value]) => (
              <div key={skill}>
                <span>{skill}</span>
                <div className="progress-line">
                  <span style={{ width: `${value}%` }} />
                </div>
                <strong>{value}%</strong>
              </div>
            ))}
          </div>
          <p className="panel-note">
            Performance reflects activities inside Fluent, not an official CEFR certification.
          </p>
        </article>
      </section>
    </div>
  )
}
