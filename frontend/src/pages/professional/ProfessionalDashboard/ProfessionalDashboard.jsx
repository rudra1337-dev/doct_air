import { Link } from "react-router-dom";
import "../../patient/PatientDashboard/PatientDashboard.css";

export default function ProfessionalDashboard() {
  return (
    <div className="workspace-view">
      <div className="workspace-view__header">
        <div>
          <span className="workspace-view__eyebrow" style={{ color: "#a5b4fc" }}>
            Healthcare Professional Portal
          </span>
          <h1 className="workspace-view__title">Clinical Workspace</h1>
        </div>
        <Link to="/professional/queue" className="btn-primary" style={{ background: "#6366f1" }}>
          View Intake Queue
        </Link>
      </div>

      {/* Main Notice Card */}
      <div className="workspace-card workspace-card--pro">
        <div className="workspace-card__icon workspace-card__icon--pro" aria-hidden="true">
          <svg width="32" height="32" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="13" stroke="#818cf8" strokeWidth="1.5" />
            <path d="M14 7v14M7 14h14" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" />
            <circle cx="14" cy="14" r="3.5" fill="#818cf8" fillOpacity="0.25" stroke="#a5b4fc" strokeWidth="1" />
          </svg>
        </div>
        <div className="workspace-card__content">
          <h2>Your clinical review workspace is being prepared.</h2>
          <p>
            DoctAir supports healthcare teams by structuring raw patient descriptions into organized,
            traceable pre-consultation reports with clear urgency flags and timeline breakdowns.
          </p>
        </div>
      </div>

      {/* Grid */}
      <div className="workspace-grid">
        <div className="workspace-grid__item">
          <h3>Intake Queue</h3>
          <p>Prioritized incoming patient summaries ready for physician review before appointments.</p>
          <Link to="/professional/queue" className="workspace-grid__link" style={{ color: "#a5b4fc" }}>
            Open Queue &rarr;
          </Link>
        </div>

        <div className="workspace-grid__item">
          <h3>Reviewed Cases</h3>
          <p>Searchable archive of verified patient records, clinical notes, and documented reviews.</p>
          <Link to="/professional/cases" className="workspace-grid__link" style={{ color: "#a5b4fc" }}>
            Case Records &rarr;
          </Link>
        </div>

        <div className="workspace-grid__item">
          <h3>Clinician Settings</h3>
          <p>Manage clinical credentials, hospital/clinic team affiliation, and review notifications.</p>
          <Link to="/professional/profile" className="workspace-grid__link" style={{ color: "#a5b4fc" }}>
            Clinician Profile &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
