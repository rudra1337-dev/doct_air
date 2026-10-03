import { Link } from "react-router-dom";
import "../PatientDashboard/PatientDashboard.css";

export default function PatientProfile() {
  return (
    <div className="workspace-view">
      <div className="workspace-view__header">
        <div>
          <span className="workspace-view__eyebrow">Patient Workspace</span>
          <h1 className="workspace-view__title">Patient Profile</h1>
        </div>
        <Link to="/patient/dashboard" className="btn-ghost">
          &larr; Back to Dashboard
        </Link>
      </div>

      <div className="workspace-placeholder-box">
        <div style={{ marginBottom: "1.25rem", display: "inline-block" }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2>Your patient profile and preferences are being prepared.</h2>
        <p>
          Configure your personal details, emergency contact information, and privacy/consent preferences for clinical sharing.
        </p>
        <Link to="/patient/dashboard" className="btn-primary">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
