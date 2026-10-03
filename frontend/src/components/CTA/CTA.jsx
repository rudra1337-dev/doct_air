import "./CTA.css";

export default function CTA() {
  return (
    <section className="cta" aria-labelledby="cta-heading">
      <div className="cta__bg-glow" aria-hidden="true" />
      <div className="cta__container">
        <h2 className="cta__heading" id="cta-heading">
          Start a better healthcare
          <br />
          information workflow.
        </h2>
        <p className="cta__sub">
          DoctAir helps healthcare facilities collect, organize, and review
          patient information more effectively. Built for modern health teams.
        </p>
        <div className="cta__actions">
          <a href="/signup" className="btn-primary" id="cta-get-started">
            Get Started
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
          <a href="#features" className="btn-ghost" id="cta-explore">
            Explore DoctAir
          </a>
        </div>
        <p className="cta__note">
          Healthcare professionals remain responsible for all clinical decisions.
          DoctAir is a decision-support tool, not a diagnostic system.
        </p>
      </div>
    </section>
  );
}
