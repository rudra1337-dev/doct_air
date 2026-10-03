import { Link } from "react-router-dom";
import "./PatientDashboard.css";

export default function PatientDashboard() {
  return (
    <div className="workspace-view">
      <div className="workspace-view__header">
        <div>
          <span className="workspace-view__eyebrow">Patient Workspace</span>
          <h1 className="workspace-view__title">Health Dashboard</h1>
        </div>
        <Link to="/patient/consultation" className="btn-primary">
          Start Consultation Intake
        </Link>
      </div>

      {/* Main Notice Card */}
      <div className="workspace-card">
        <div className="workspace-card__icon" aria-hidden="true">
          <svg width="32" height="32" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="13" stroke="#0ea5e9" strokeWidth="1.5" />
            <path d="M14 7v14M7 14h14" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" />
            <circle cx="14" cy="14" r="3.5" fill="#0ea5e9" fillOpacity="0.25" stroke="#38bdf8" strokeWidth="1" />
          </svg>
        </div>
        <div className="workspace-card__content">
          <h2>Your healthcare workspace is being prepared.</h2>
          <p>
            DoctAir's patient portal allows you to describe health concerns in natural conversation,
            receive structured summaries of your intake, and securely share them with healthcare providers.
          </p>
        </div>
      </div>

      {/* Workspace Modules Grid */}
      <div className="workspace-grid">
        <div className="workspace-grid__item">
          <h3>Guided Intake</h3>
          <p>Conversational questionnaire to capture symptoms, duration, and prior medical history.</p>
          <Link to="/patient/consultation" className="workspace-grid__link">
            Consultation Intake &rarr;
          </Link>
        </div>

        <div className="workspace-grid__item">
          <h3>Submitted Cases</h3>
          <p>Review past intake reports prepared for your healthcare professional appointments.</p>
          <Link to="/patient/cases" className="workspace-grid__link">
            View Cases &rarr;
          </Link>
        </div>

        <div className="workspace-grid__item">
          <h3>Health Profile</h3>
          <p>Manage your health preferences, emergency contacts, and data consent settings.</p>
          <Link to="/patient/profile" className="workspace-grid__link">
            Profile Settings &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
