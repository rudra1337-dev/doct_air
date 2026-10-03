import "./HowItWorks.css";

const STEPS = [
  {
    num: "01",
    title: "Talk",
    body:  "The patient describes their health concern naturally — through text or voice — in their own words.",
    icon:  "💬",
  },
  {
    num: "02",
    title: "Share",
    body:  "The patient can provide relevant reports, prescriptions, or images for additional context.",
    icon:  "📎",
  },
  {
    num: "03",
    title: "Understand",
    body:  "DoctAir organizes the available information, identifies missing details, and asks targeted follow-up questions.",
    icon:  "🔍",
  },
  {
    num: "04",
    title: "Prepare",
    body:  "A structured patient information report is generated and made ready for healthcare professional review.",
    icon:  "📋",
  },
  {
    num: "05",
    title: "Review",
    body:  "The healthcare professional reviews the organized case, applies clinical judgment, and determines the next step.",
    icon:  "🩺",
  },
];

export default function HowItWorks() {
  return (
    <section className="hiw" id="how-it-works" aria-labelledby="hiw-heading">
      <div className="hiw__container">
        <div className="hiw__header">
          <p className="hiw__eyebrow">Workflow</p>
          <h2 className="hiw__heading" id="hiw-heading">
            How DoctAir works
          </h2>
          <p className="hiw__sub">
            A transparent, step-by-step process designed around patient safety
            and professional oversight.
          </p>
        </div>

        <ol className="hiw__steps" aria-label="DoctAir 5-step workflow">
          {STEPS.map((step, i) => (
            <li className="hiw__step" key={step.num}>
              <div className="hiw__step-num" aria-hidden="true">{step.num}</div>
              <div className="hiw__step-icon" aria-hidden="true">{step.icon}</div>
              <div className="hiw__step-content">
                <h3 className="hiw__step-title">{step.title}</h3>
                <p className="hiw__step-body">{step.body}</p>
              </div>
              {i < STEPS.length - 1 && (
                <div className="hiw__connector" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12h14M14 7l5 5-5 5" stroke="#1e3a5f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
