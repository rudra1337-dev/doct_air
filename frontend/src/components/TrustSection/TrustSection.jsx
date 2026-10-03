import "./TrustSection.css";

const TRUST_ITEMS = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 3l8 4v5c0 5-3.5 9-8 10C7.5 21 4 17 4 12V7l8-4z" stroke="#0ea5e9" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M9 12l2 2 4-4" stroke="#0ea5e9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: "Human Reviewed",
    body:  "All patient information is prepared for qualified healthcare professionals. DoctAir organizes, never decides.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="#f59e0b" strokeWidth="1.5"/>
        <path d="M12 8v5M12 15.5v.5" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    title: "Safety First",
    body:  "Potential urgency is surfaced and flagged for appropriate professional review. Critical concerns are never buried.",
    accent: "amber",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="3" stroke="#10b981" strokeWidth="1.5"/>
        <path d="M7 12h10M7 8h6M7 16h8" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    title: "Structured Information",
    body:  "Conversations and documents are transformed into organized, readable patient information ready for clinical review.",
    accent: "green",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="11" width="18" height="10" rx="2" stroke="#818cf8" strokeWidth="1.5"/>
        <path d="M7 11V7a5 5 0 0110 0v4" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    title: "Privacy Conscious",
    body:  "Designed around consent, controlled access, and responsible data handling from the ground up.",
    accent: "purple",
  },
];

export default function TrustSection() {
  return (
    <section className="trust" id="safety" aria-labelledby="trust-heading">
      <div className="trust__container">
        <div className="trust__header">
          <p className="trust__eyebrow">Built for Trust</p>
          <h2 className="trust__heading" id="trust-heading">
            Human oversight at every step
          </h2>
          <p className="trust__sub">
            DoctAir is designed from the ground up around the principle that
            healthcare professionals remain in control of every clinical decision.
          </p>
        </div>

        <div className="trust__grid" role="list">
          {TRUST_ITEMS.map(({ icon, title, body, accent }) => (
            <article
              className={["trust__card", accent ? `trust__card--${accent}` : ""].join(" ")}
              key={title}
              role="listitem"
            >
              <div className="trust__icon" aria-hidden="true">{icon}</div>
              <h3 className="trust__card-title">{title}</h3>
              <p className="trust__card-body">{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
