import { Link } from "react-router-dom";
import "../PatientDashboard/PatientDashboard.css";

export default function PatientCases() {
  return (
    <div className="workspace-view">
      <div className="workspace-view__header">
        <div>
          <span className="workspace-view__eyebrow">Patient Workspace</span>
          <h1 className="workspace-view__title">My Submitted Cases</h1>
        </div>
        <Link to="/patient/dashboard" className="btn-ghost">
          &larr; Back to Dashboard
        </Link>
      </div>

      <div className="workspace-placeholder-box">
        <div style={{ marginBottom: "1.25rem", display: "inline-block" }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M9 12h6M9 16h6M9 8h6M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2>Your health records and case history are being prepared.</h2>
        <p>
          Historical intake conversations and clinical summaries shared with your healthcare team will appear here once submitted.
        </p>
        <Link to="/patient/consultation" className="btn-primary">
          Start New Intake Consultation
        </Link>
      </div>
    </div>
  );
}
