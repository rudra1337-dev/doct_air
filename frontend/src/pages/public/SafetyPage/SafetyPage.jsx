import { Link } from "react-router-dom";
import "./SafetyPage.css";

const SAFETY_PILLARS = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 3l8 4v5c0 5-3.5 9-8 10C7.5 21 4 17 4 12V7l8-4z" stroke="#0ea5e9" strokeWidth="1.75" strokeLinejoin="round" />
        <path d="M9 12l2 2 4-4" stroke="#0ea5e9" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "Strict Non-Diagnostic Principle",
    description:
      "DoctAir is strictly an informational structuring tool, not an autonomous diagnostician. Our models collect, categorize, and summarize patient symptom histories so that human clinicians can make informed diagnostic decisions.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="#f59e0b" strokeWidth="1.75" />
        <path d="M12 8v5M12 15.5v.5" stroke="#f59e0b" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    ),
    title: "Urgency Triage & Immediate Escalation",
    description:
      "Critical warning signals such as chest pain, severe shortness of breath, sudden neurological deficits, or severe trauma are immediately flagged for human medical priority and are never managed in an automated loop.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="11" width="18" height="10" rx="2" stroke="#818cf8" strokeWidth="1.75" />
        <path d="M7 11V7a5 5 0 0110 0v4" stroke="#818cf8" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    ),
    title: "Privacy Conscious & Access Controlled",
    description:
      "All health discussions and clinical files are encrypted in transit and at rest. Access is strictly partitioned between patient workspaces and authorized healthcare provider clinical portals.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="3" stroke="#10b981" strokeWidth="1.75" />
        <path d="M7 12h10M7 8h6M7 16h8" stroke="#10b981" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    ),
    title: "Transparent & Auditable Outputs",
    description:
      "Clinicians can inspect exact patient dialogue excerpts supporting every synthesized data point in the generated intake summary, ensuring verifiable and traceable documentation.",
  },
];

export default function SafetyPage() {
  return (
    <div className="safety-page">
      <div className="safety-page__container">
        {/* Header */}
        <header className="safety-page__header">
          <div className="safety-page__badge">
            <span className="safety-page__badge-dot" aria-hidden="true" />
            Safety & Clinical Boundaries
          </div>
          <h1 className="safety-page__title">
            Human Oversight <span className="gradient-text">Built into Every Step.</span>
          </h1>
          <p className="safety-page__subtitle">
            DoctAir is engineered to empower healthcare professionals with structured patient
            insights while maintaining transparent clinical guardrails and patient safety protocols.
          </p>
        </header>

        {/* Clinical Disclaimer Banner */}
        <div className="safety-page__disclaimer-card" role="note">
          <div className="safety-page__disclaimer-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="9" stroke="#38bdf8" strokeWidth="1.5" />
              <path d="M10 6v5M10 14v.5" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="safety-page__disclaimer-content">
            <h3>Medical Disclaimer</h3>
            <p>
              DoctAir does not provide medical diagnoses, treatment recommendations, or emergency services.
              If you are experiencing a medical emergency, please call your local emergency number immediately.
            </p>
          </div>
        </div>

        {/* Pillars Grid */}
        <section className="safety-page__grid" aria-label="Core safety pillars">
          {SAFETY_PILLARS.map((pillar) => (
            <div className="safety-page__card" key={pillar.title}>
              <div className="safety-page__card-icon">{pillar.icon}</div>
              <h2 className="safety-page__card-title">{pillar.title}</h2>
              <p className="safety-page__card-desc">{pillar.description}</p>
            </div>
          ))}
        </section>

        {/* Bottom CTA */}
        <div className="safety-page__footer-cta">
          <h2>Ready to experience safer clinical conversations?</h2>
          <div className="safety-page__cta-actions">
            <Link to="/sign-up" className="btn-primary">
              Get Started with DoctAir
            </Link>
            <Link to="/" className="btn-ghost">
              Back to Overview
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
