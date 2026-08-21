import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export function OnboardingPage() {
  return (
    <main className="onboarding-page">
      <section>
        <div className="onboarding-progress">
          <span>1 of 5</span>
          <div className="progress-line">
            <span style={{ width: '20%' }} />
          </div>
        </div>
        <p className="eyebrow">Welcome</p>
        <h1>Let's build your English step by step</h1>
        <p>We'll use your goals to set up a learning path that fits you.</p>
        <Link className="button button--primary button--large" to="/app/home">
          Get started <ArrowRight size={18} />
        </Link>
      </section>
      <div aria-hidden="true" className="onboarding-visual">
        <span>A2</span>
        <i />
        <span>B1</span>
        <i />
        <span>B2</span>
        <i />
        <span>C1</span>
      </div>
    </main>
  )
}
