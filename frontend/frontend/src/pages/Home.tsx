import './Home.css'

export function Home() {
  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero-section">
        <h1 className="hero-title">ElderCare AI</h1>
        <p className="hero-subtitle">Intelligent Monitoring for Proactive Care</p>
        <p className="hero-description">
          ElderCare AI is a scalable, camera-based monitoring system specifically designed for elder-care dining commons.
          By focusing on dining—one of the most indicative moments for identifying health conditions—our 
          system detects early signs of physical decline, cognitive issues, or sudden health changes.
        </p>
      </section>

      {/* Challenge Section */}
      <section className="content-section challenge-section">
        <h2 className="section-title">The Challenge: The Monitoring Gap</h2>
        <p className="section-intro">
          Current elder care facilities face significant hurdles in maintaining continuous resident supervision:
        </p>
        <div className="challenge-grid">
          <div className="challenge-card">
            <div className="challenge-icon">👥</div>
            <h3 className="challenge-card-title">Staffing Shortages</h3>
            <p className="challenge-card-text">
              Nursing homes often struggle with low staffing levels, particularly on weekends when RN staffing can drop by as much as <strong>42%</strong>.
            </p>
          </div>
          <div className="challenge-card">
            <div className="challenge-icon">⚖️</div>
            <h3 className="challenge-card-title">Quality of Care</h3>
            <p className="challenge-card-text">
              Lower staffing numbers directly correlate with fewer opportunities for personalized assessments and early health detection.
            </p>
          </div>
          <div className="challenge-card">
            <div className="challenge-icon">📹</div>
            <h3 className="challenge-card-title">Reactive vs. Proactive</h3>
            <p className="challenge-card-text">
              While security cameras exist, they are typically only reviewed after an incident has occurred because staff do not have the time to monitor live feeds.
            </p>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="content-section solution-section">
        <h2 className="section-title">Our Solution: Passive Observation, Active Insights</h2>
        <p className="solution-description">
          ElderCare AI fills this gap by passively observing residents during meals to generate daily, individual health summaries. 
          Instead of requiring continuous human supervision, the system focuses on trend detection and anomaly awareness to flag risks for timely human follow-up.
        </p>
      </section>

      {/* Key Health Indicators Section */}
      <section className="content-section indicators-section">
        <h2 className="section-title">Key Health Indicators We Track</h2>
        <div className="indicators-grid">
          <div className="indicator-card">
            <div className="indicator-header">
              <div className="indicator-icon">🧠</div>
              <h3 className="indicator-title">Cognitive & Social</h3>
            </div>
            <p className="indicator-description">
              Monitoring for social isolation, reduced engagement, or sudden withdrawal from routines.
            </p>
          </div>
          <div className="indicator-card">
            <div className="indicator-header">
              <div className="indicator-icon">🍽️</div>
              <h3 className="indicator-title">Eating & Oral-Motor</h3>
            </div>
            <p className="indicator-description">
              Detecting chewing asymmetry (possible dental pain or stroke), slowed eating, or reduced food intake.
            </p>
          </div>
          <div className="indicator-card">
            <div className="indicator-header">
              <div className="indicator-icon">💪</div>
              <h3 className="indicator-title">Physical & Neuromotor</h3>
            </div>
            <p className="indicator-description">
              Identifying postural instability, hand tremors, or fatigue indicators like dozing off mid-meal.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
