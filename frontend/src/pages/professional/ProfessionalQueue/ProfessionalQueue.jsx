import { Link } from "react-router-dom";
import "../../patient/PatientDashboard/PatientDashboard.css";

export default function ProfessionalQueue() {
  return (
    <div className="workspace-view">
      <div className="workspace-view__header">
        <div>
          <span className="workspace-view__eyebrow" style={{ color: "#a5b4fc" }}>
            Healthcare Professional Portal
          </span>
          <h1 className="workspace-view__title">Clinical Intake Queue</h1>
        </div>
        <Link to="/professional/dashboard" className="btn-ghost">
          &larr; Back to Workspace
        </Link>
      </div>

      <div className="workspace-placeholder-box">
        <div style={{ marginBottom: "1.25rem", display: "inline-block" }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h7" stroke="#a5b4fc" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <h2>Clinical Intake Queue</h2>
        <p>
          Your clinical review queue is being prepared. Incoming patient consultations with structured symptom
          timelines and urgency stratification will appear here for physician verification.
        </p>
        <Link to="/professional/dashboard" className="btn-primary" style={{ background: "#6366f1" }}>
          Return to Clinical Workspace
        </Link>
      </div>
    </div>
  );
}
