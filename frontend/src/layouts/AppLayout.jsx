import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./AppLayout.css";

const PATIENT_NAV = [
  { label: "Dashboard", path: "/patient/dashboard" },
  { label: "Consultation", path: "/patient/consultation" },
  { label: "Cases", path: "/patient/cases" },
  { label: "Profile", path: "/patient/profile" },
];

const PROFESSIONAL_NAV = [
  { label: "Dashboard", path: "/professional/dashboard" },
  { label: "Clinical Queue", path: "/professional/queue" },
  { label: "Cases", path: "/professional/cases" },
  { label: "Profile", path: "/professional/profile" },
];

export default function AppLayout({ role = "patient" }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth() || {};

  const isProfessional = role === "professional";
  const navItems = isProfessional ? PROFESSIONAL_NAV : PATIENT_NAV;
  const roleLabel = isProfessional ? "Clinical Review Portal" : "Patient Portal";

  // Close mobile drawer on route navigation
  const [prevPath, setPrevPath] = useState(location.pathname);
  if (prevPath !== location.pathname) {
    setPrevPath(location.pathname);
    setMobileMenuOpen(false);
  }

  const isConsultation = location.pathname.startsWith('/patient/consultation');

  return (
    <div className={`app-layout ${isConsultation ? "app-layout--full-screen" : ""}`}>
      {/* Application Top Navigation Bar */}
      <header className="app-layout__header" role="banner">
        <div className="app-layout__header-inner">
          {/* Brand & Workspace Badge */}
          <div className="app-layout__brand-group">
            <Link to="/" className="app-layout__logo" aria-label="DoctAir home">
              <span className="app-layout__logo-icon" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
                  <circle cx="14" cy="14" r="13" stroke="#0ea5e9" strokeWidth="1.5" />
                  <path d="M14 7v14M7 14h14" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="14" cy="14" r="3.5" fill="#0ea5e9" fillOpacity="0.25" stroke="#38bdf8" strokeWidth="1" />
                </svg>
              </span>
              <span className="app-layout__logo-text">DoctAir</span>
            </Link>

            <span className={`app-layout__role-badge ${isProfessional ? "app-layout__role-badge--pro" : ""}`}>
              {roleLabel}
            </span>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="app-layout__nav" aria-label="Application navigation">
            <ul className="app-layout__nav-list" role="list">
              {navItems.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      `app-layout__nav-link ${isActive ? "app-layout__nav-link--active" : ""}`
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          {/* Session / Right Controls */}
          <div className="app-layout__controls">
            <Link to="/" className="app-layout__home-link" title="Return to public site">
              Public Site
            </Link>

            {user && (
              <button
                type="button"
                onClick={logout}
                className="app-layout__logout-btn"
                aria-label="Sign out"
              >
                Sign Out
              </button>
            )}

            {/* Mobile Hamburger */}
            <button
              type="button"
              className={`app-layout__hamburger ${mobileMenuOpen ? "app-layout__hamburger--open" : ""}`}
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        <div
          className={`app-layout__mobile-drawer ${mobileMenuOpen ? "app-layout__mobile-drawer--open" : ""}`}
          aria-hidden={!mobileMenuOpen}
        >
          <ul className="app-layout__mobile-list" role="list">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `app-layout__mobile-link ${isActive ? "app-layout__mobile-link--active" : ""}`
                  }
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
            <li className="app-layout__mobile-divider">
              <Link to="/" className="app-layout__mobile-link" onClick={() => setMobileMenuOpen(false)}>
                Return to Public Site
              </Link>
            </li>
          </ul>
        </div>
      </header>

      {/* Main Workspace Content Area */}
      <main
        id="app-main-content"
        className={`app-layout__content ${location.pathname.startsWith('/patient/consultation') ? "app-layout__content--full" : ""}`}
      >
        <Outlet />
      </main>

      {/* Application Footer (omitted on full-screen consultation) */}
      {!location.pathname.startsWith('/patient/consultation') && (
        <footer className="app-layout__footer" role="contentinfo">
          <div className="app-layout__footer-inner">
            <p className="app-layout__footer-text">
              DoctAir Decision Support Platform &bull; Human-in-the-loop clinical review
            </p>
            <span className="app-layout__footer-status">System Operational</span>
          </div>
        </footer>
      )}
    </div>
  );
}
