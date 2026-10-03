import "./PageLoader.css";

export default function PageLoader({ message = "Loading DoctAir..." }) {
  return (
    <div className="page-loader" role="status" aria-live="polite">
      <div className="page-loader__wrapper">
        <div className="page-loader__spinner-box">
          <div className="page-loader__glow" aria-hidden="true" />
          <svg className="page-loader__icon" width="48" height="48" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <circle cx="14" cy="14" r="13" stroke="#0ea5e9" strokeWidth="1.5" strokeDasharray="60" strokeDashoffset="20" className="page-loader__ring" />
            <path d="M14 7v14M7 14h14" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" />
            <circle cx="14" cy="14" r="3.5" fill="#0ea5e9" fillOpacity="0.25" stroke="#38bdf8" strokeWidth="1" />
          </svg>
        </div>
        <p className="page-loader__text">{message}</p>
      </div>
    </div>
  );
}
