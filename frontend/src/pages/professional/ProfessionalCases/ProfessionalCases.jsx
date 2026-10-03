import { Link } from "react-router-dom";
import "../../patient/PatientDashboard/PatientDashboard.css";

export default function ProfessionalCases() {
  return (
    <div className="workspace-view">
      <div className="workspace-view__header">
        <div>
          <span className="workspace-view__eyebrow" style={{ color: "#a5b4fc" }}>
            Healthcare Professional Portal
          </span>
          <h1 className="workspace-view__title">Reviewed Case Files</h1>
        </div>
        <Link to="/professional/dashboard" className="btn-ghost">
          &larr; Back to Workspace
        </Link>
      </div>

      <div className="workspace-placeholder-box">
        <div style={{ marginBottom: "1.25rem", display: "inline-block" }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" stroke="#a5b4fc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2>Patient case files and structured summaries are being prepared.</h2>
        <p>
          Historical patient consultations with approved clinician summaries and intake notes will be archived and accessible here.
        </p>
        <Link to="/professional/dashboard" className="btn-primary" style={{ background: "#6366f1" }}>
          Return to Clinical Workspace
        </Link>
      </div>
    </div>
  );
}
