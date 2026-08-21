export function ProfilePage() {
  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1>Profile</h1>
          <p>Your learning preferences and account details.</p>
        </div>
      </header>
      <section className="panel">
        <div className="profile-summary">
          <span className="profile-avatar">DK</span>
          <div>
            <h2>Dmitry</h2>
            <p>Working towards B1 · Career English</p>
          </div>
        </div>
      </section>
    </div>
  )
}
