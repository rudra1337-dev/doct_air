import "./ForTeams.css";

const FLOW_STEPS = [
  { label: "Patient Conversation",  sub: "Structured intake via chat or voice" },
  { label: "Structured Case",       sub: "Organized patient information"        },
  { label: "Priority / Triage",     sub: "Urgency surfaced for review"          },
  { label: "Professional Review",   sub: "Clinician reviews and annotates"      },
  { label: "Referral / Next Step",  sub: "Clinician determines appropriate action" },
];

export default function ForTeams() {
  return (
    <section className="for-teams" id="for-teams" aria-labelledby="for-teams-heading">
      <div className="for-teams__container">
        <div className="for-teams__grid">
          {/* Left: text */}
          <div className="for-teams__content">
            <p className="for-teams__eyebrow">For Healthcare Teams</p>
            <h2 className="for-teams__heading" id="for-teams-heading">
              Organized information.
              <br />
              More time for patients.
            </h2>
            <p className="for-teams__body">
              DoctAir helps healthcare teams receive pre-organized patient information
              before the clinical encounter begins — reducing administrative load and
              allowing more focused professional attention.
            </p>
            <ul className="for-teams__benefits" aria-label="Key benefits for healthcare teams">
              {[
                "Structured cases ready for clinical review",
                "Urgency indicators surfaced automatically",
                "Patient history and documents in one place",
                "Reduces repetitive information gathering",
                "Designed for PHCs, hospitals, and campus clinics",
              ].map((b) => (
                <li key={b} className="for-teams__benefit">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <circle cx="8" cy="8" r="7" fill="rgba(14,165,233,0.15)" stroke="rgba(14,165,233,0.4)" strokeWidth="1"/>
                    <path d="M5 8l2 2 4-4" stroke="#0ea5e9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {b}
                </li>
              ))}
            </ul>
          </div>

          {/* Right: workflow diagram */}
          <div className="for-teams__flow" aria-label="Clinical workflow steps">
            {FLOW_STEPS.map((step, i) => (
              <div key={step.label} className="for-teams__flow-item">
                <div className="for-teams__flow-card">
                  <div className="for-teams__flow-dot" aria-hidden="true">
                    {i + 1}
                  </div>
                  <div>
                    <p className="for-teams__flow-label">{step.label}</p>
                    <p className="for-teams__flow-sub">{step.sub}</p>
                  </div>
                </div>
                {i < FLOW_STEPS.length - 1 && (
                  <div className="for-teams__flow-arrow" aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M10 4v12M6 12l4 4 4-4" stroke="#1e3a5f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
