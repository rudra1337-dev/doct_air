import { Link } from "react-router-dom";
import "./NotFound.css";

export default function NotFound() {
  return (
    <div className="not-found-page">
      <div className="not-found-card">
        {/* Glow & Emblem */}
        <div className="not-found-card__badge">
          <span className="not-found-card__badge-dot" aria-hidden="true" />
          404 Error
        </div>

        <h1 className="not-found-card__code">404</h1>
        <h2 className="not-found-card__title">Page Not Found</h2>

        <p className="not-found-card__message">
          The healthcare resource or page you are looking for does not exist, has been relocated, or is temporarily unavailable.
        </p>

        <div className="not-found-card__actions">
          <Link to="/" className="btn-primary" id="not-found-back-home">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M13 8H3M7 4L3 8l4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to DoctAir
          </Link>
          <Link to="/safety" className="btn-ghost">
            View Safety Guidelines
          </Link>
        </div>
      </div>
    </div>
  );
}
