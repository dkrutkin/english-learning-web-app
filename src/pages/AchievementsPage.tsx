import { Award, CheckCircle2, Flame, Sparkles } from 'lucide-react'
const achievements = [
  { title: 'First Step', text: 'Complete your first lesson.', icon: Sparkles },
  { title: 'Consistent Week', text: 'Study on 7 consecutive days.', icon: Flame },
  { title: 'First Module', text: 'Complete your first module.', icon: CheckCircle2 },
  {
    title: 'Level Complete',
    text: 'Complete all required modules of one CEFR level.',
    icon: Award,
  },
]

export function AchievementsPage() {
  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1>Achievements</h1>
          <p>Meaningful milestones from your learning journey.</p>
        </div>
      </header>
      <section className="achievement-grid">
        {achievements.map(({ title, text, icon: Icon }, index) => (
          <article className={index < 2 ? 'is-unlocked' : 'is-locked'} key={title}>
            <span className="achievement-icon">
              <Icon size={24} />
            </span>
            <div>
              <h2>{title}</h2>
              <p>{text}</p>
              <small>{index < 2 ? 'Unlocked Aug 21' : 'Locked'}</small>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}
