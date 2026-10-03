import { Link } from "react-router-dom";
import "../../patient/PatientDashboard/PatientDashboard.css";

export default function ProfessionalProfile() {
  return (
    <div className="workspace-view">
      <div className="workspace-view__header">
        <div>
          <span className="workspace-view__eyebrow" style={{ color: "#a5b4fc" }}>
            Healthcare Professional Portal
          </span>
          <h1 className="workspace-view__title">Clinician Profile & Credentials</h1>
        </div>
        <Link to="/professional/dashboard" className="btn-ghost">
          &larr; Back to Workspace
        </Link>
      </div>

      <div className="workspace-placeholder-box">
        <div style={{ marginBottom: "1.25rem", display: "inline-block" }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" stroke="#a5b4fc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2>Your clinician credentials and workspace settings are being prepared.</h2>
        <p>
          Configure your medical license verification, clinical practice affiliation, specialty focus, and notification preferences.
        </p>
        <Link to="/professional/dashboard" className="btn-primary" style={{ background: "#6366f1" }}>
          Return to Clinical Workspace
        </Link>
      </div>
    </div>
  );
}
