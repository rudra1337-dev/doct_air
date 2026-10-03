import "./Features.css";

const FEATURES = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <path d="M4 6h14M4 11h10M4 16h12" stroke="#0ea5e9" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    title: "Conversational Patient Intake",
    body:  "Patients describe concerns naturally. No forms. No medical jargon required.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <circle cx="11" cy="11" r="8" stroke="#818cf8" strokeWidth="1.5"/>
        <path d="M11 7v4l3 3" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    title: "Voice Interaction",
    body:  "Patients can speak their concerns aloud. DoctAir transcribes and processes spoken language.",
    accent: "purple",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <rect x="3" y="3" width="16" height="16" rx="2" stroke="#10b981" strokeWidth="1.5"/>
        <path d="M7 11l3 3 5-5" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: "Report & Document Understanding",
    body:  "Lab reports, prescriptions, and referral letters are analyzed and included in the case summary.",
    accent: "green",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <path d="M11 4v14M4 11h14" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="11" cy="11" r="8" stroke="#f59e0b" strokeWidth="1.5"/>
      </svg>
    ),
    title: "Dynamic Follow-up Questions",
    body:  "Missing or ambiguous information is identified and collected through targeted follow-up questions.",
    accent: "amber",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <path d="M4 4v14l4-3 3 3 3-3 4 3V4" stroke="#0ea5e9" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    ),
    title: "Patient Timeline",
    body:  "Symptoms, history, and events are organized into a chronological health timeline.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <rect x="2" y="2" width="18" height="18" rx="3" stroke="#818cf8" strokeWidth="1.5"/>
        <path d="M6 8h10M6 12h7M6 16h4" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    title: "Structured Health Reports",
    body:  "Patient information is formatted into structured clinical-ready reports for healthcare professionals.",
    accent: "purple",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <path d="M11 3l8 4v5c0 5-3.5 8-8 9C7.5 20 4 17 4 12V7l7-4z" stroke="#ef4444" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M11 9v4M11 15v.5" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    title: "Safety-first Triage",
    body:  "Potential urgency signals are surfaced for appropriate prioritization by healthcare staff.",
    accent: "red",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <rect x="3" y="3" width="16" height="16" rx="3" stroke="#10b981" strokeWidth="1.5"/>
        <circle cx="11" cy="9" r="3" stroke="#10b981" strokeWidth="1.5"/>
        <path d="M5 19c0-3 2.7-5 6-5s6 2 6 5" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    title: "Professional Review Dashboard",
    body:  "A clean interface for healthcare professionals to review cases, add notes, and determine next steps.",
    accent: "green",
  },
];

export default function Features() {
  return (
    <section className="features" id="features" aria-labelledby="features-heading">
      <div className="features__container">
        <div className="features__header">
          <p className="features__eyebrow">Product</p>
          <h2 className="features__heading" id="features-heading">
            Everything your facility needs
          </h2>
          <p className="features__sub">
            A complete workflow from patient conversation to professional review,
            built for hospitals, health centres, and campus clinics.
          </p>
        </div>

        <div className="features__grid" role="list">
          {FEATURES.map(({ icon, title, body, accent }) => (
            <article
              className={["feature-card", accent ? `feature-card--${accent}` : ""].join(" ")}
              key={title}
              role="listitem"
            >
              <div className="feature-card__icon">{icon}</div>
              <h3 className="feature-card__title">{title}</h3>
              <p className="feature-card__body">{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
