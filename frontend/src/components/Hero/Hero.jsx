import "./Hero.css";

export default function Hero() {
  return (
    <section className="hero" id="hero" aria-labelledby="hero-heading">
      {/* Background elements */}
      <div className="hero__bg-glow hero__bg-glow--1" aria-hidden="true" />
      <div className="hero__bg-glow hero__bg-glow--2" aria-hidden="true" />
      <div className="hero__grid-overlay" aria-hidden="true" />

      <div className="hero__container">
        {/* Text content */}
        <div className="hero__content">
          <div className="hero__badge" aria-label="Product status">
            <span className="hero__badge-dot" aria-hidden="true" />
            AI-Assisted Healthcare Platform
          </div>

          <h1 className="hero__heading" id="hero-heading">
            Smarter Health Conversations.
            <span className="gradient-text"> Better Clinical Review.</span>
          </h1>

          <p className="hero__subheading">
            DoctAir helps patients describe their health concerns through guided conversation
            and organizes that information into structured reports for qualified healthcare professionals.
          </p>

          <div className="hero__disclaimer">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM8 5v5M8 11.5v.5" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span>DoctAir supports healthcare professionals. It does not replace clinical judgment.</span>
          </div>

          <div className="hero__actions">
            <a href="/signup" className="btn-primary" id="hero-get-started">
              Get Started
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
            <a href="#how-it-works" className="btn-ghost" id="hero-how-it-works">
              See How It Works
            </a>
          </div>

          <div className="hero__stats" role="list">
            {[
              { value: "Human", label: "Reviewed" },
              { value: "Safety", label: "First Triage" },
              { value: "Structured", label: "Patient Reports" },
            ].map(({ value, label }) => (
              <div className="hero__stat" role="listitem" key={label}>
                <span className="hero__stat-value">{value}</span>
                <span className="hero__stat-label">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Conversation Visual */}
        <div className="hero__visual" aria-label="DoctAir conversation interface preview">
          <div className="hero__chat-card animate-float">
            <div className="hero__chat-header">
              <div className="hero__chat-status">
                <span className="hero__status-dot" aria-hidden="true" />
                <span>DoctAir — Secure Health Session</span>
              </div>
              <div className="hero__chat-controls" aria-hidden="true">
                <span /><span /><span />
              </div>
            </div>

            <div className="hero__chat-body" role="log" aria-label="Sample conversation">
              <div className="hero__chat-message hero__chat-message--patient">
                <div className="hero__msg-avatar" aria-hidden="true">P</div>
                <div className="hero__msg-bubble">
                  <p>I've had a fever since yesterday. Around 38.5°C. I also have a sore throat and feel really tired.</p>
                  <span className="hero__msg-time">Just now</span>
                </div>
              </div>

              <div className="hero__chat-message hero__chat-message--ai">
                <div className="hero__msg-avatar hero__msg-avatar--ai" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="6" stroke="#0ea5e9" strokeWidth="1.2"/>
                    <path d="M7 4v3.5M7 9v.5" stroke="#0ea5e9" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="hero__msg-bubble hero__msg-bubble--ai">
                  <p>Thank you for sharing that. Have you noticed any difficulty swallowing, or any rash?</p>
                  <span className="hero__msg-time">Collecting information</span>
                </div>
              </div>

              <div className="hero__chat-message hero__chat-message--patient">
                <div className="hero__msg-avatar" aria-hidden="true">P</div>
                <div className="hero__msg-bubble">
                  <p>Swallowing is a bit uncomfortable. No rash though.</p>
                  <span className="hero__msg-time">Just now</span>
                </div>
              </div>

              {/* Structured output panel */}
              <div className="hero__structured-panel" aria-label="Extracted patient information">
                <div className="hero__panel-label">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <rect x="1" y="1" width="10" height="10" rx="2" stroke="#10b981" strokeWidth="1.2"/>
                    <path d="M3.5 6l2 2 3-3" stroke="#10b981" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Extracted Information
                </div>
                <div className="hero__info-row">
                  <span className="hero__info-key">Symptom</span>
                  <span className="hero__info-val">Fever 38.5°C, Sore throat</span>
                </div>
                <div className="hero__info-row">
                  <span className="hero__info-key">Duration</span>
                  <span className="hero__info-val">Since yesterday</span>
                </div>
                <div className="hero__info-row">
                  <span className="hero__info-key">Associated</span>
                  <span className="hero__info-val">Fatigue, mild dysphagia</span>
                </div>
                <div className="hero__info-row hero__info-row--pending">
                  <span className="hero__info-key">Pending</span>
                  <span className="hero__info-val hero__info-val--pending">Medical history, Medications</span>
                </div>
              </div>
            </div>

            {/* Input bar */}
            <div className="hero__chat-input" aria-label="Chat input area">
              <span className="hero__input-placeholder">Describe your concern…</span>
              <button className="hero__input-send" aria-label="Send message">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M1 7h12M8 3l4 4-4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
