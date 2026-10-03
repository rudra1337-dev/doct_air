import "./ResponsibleAI.css";

const AI_POINTS = [
  {
    title: "AI information is advisory",
    body:  "DoctAir organizes and presents information. Healthcare professionals apply clinical judgment.",
  },
  {
    title: "Professionals remain responsible",
    body:  "Every clinical decision is made by qualified healthcare professionals, not by the system.",
  },
  {
    title: "Urgent concerns receive human attention",
    body:  "Potential urgency signals are surfaced to healthcare staff and are never managed autonomously.",
  },
  {
    title: "Privacy and controlled access",
    body:  "Patient information is handled with consent, controlled access, and responsible data practices.",
  },
];

export default function ResponsibleAI() {
  return (
    <section className="responsible-ai" id="responsible-ai" aria-labelledby="rai-heading">
      <div className="rai__container">
        <div className="rai__box">
          <div className="rai__left">
            <p className="rai__eyebrow">Responsible AI</p>
            <h2 className="rai__heading" id="rai-heading">
              DoctAir supports healthcare professionals.
              <span className="gradient-text"> It does not replace them.</span>
            </h2>
            <p className="rai__body">
              We believe technology in healthcare must earn trust through transparency,
              safety, and an unwavering commitment to human oversight.
            </p>
          </div>

          <div className="rai__points" role="list">
            {AI_POINTS.map(({ title, body }) => (
              <div className="rai__point" role="listitem" key={title}>
                <div className="rai__point-icon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13z" stroke="#0ea5e9" strokeWidth="1.2"/>
                    <path d="M8 6v4M8 11.5v.5" stroke="#0ea5e9" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                </div>
                <div>
                  <p className="rai__point-title">{title}</p>
                  <p className="rai__point-body">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
