import { Link } from "react-router-dom";
import "../PatientDashboard/PatientDashboard.css";

export default function PatientConsultation() {
  return (
    <div className="workspace-view">
      <div className="workspace-view__header">
        <div>
          <span className="workspace-view__eyebrow">Patient Workspace</span>
          <h1 className="workspace-view__title">Consultation Intake</h1>
        </div>
        <Link to="/patient/dashboard" className="btn-ghost">
          &larr; Back to Dashboard
        </Link>
      </div>

      <div className="workspace-placeholder-box">
        <div style={{ marginBottom: "1.25rem", display: "inline-block" }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2>AI-Assisted Consultation Intake</h2>
        <p>
          Your guided health consultation session is being prepared. Soon, you will be able to describe your
          symptoms conversationally and create a structured pre-visit intake report for your physician.
        </p>
        <Link to="/patient/dashboard" className="btn-primary">
          Return to Patient Workspace
        </Link>
      </div>
    </div>
  );
}
