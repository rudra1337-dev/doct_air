import { useState, useEffect, useRef } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Navbar.css";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const navRef = useRef(null);
  const { user, logout } = useAuth() || {};

  // Track scroll state for glassmorphic backdrop
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Automatically reset mobile menu on route change
  const [prevPath, setPrevPath] = useState(location.pathname);
  if (prevPath !== location.pathname) {
    setPrevPath(location.pathname);
    setMenuOpen(false);
  }

  // Close mobile menu on outside click & Escape key
  useEffect(() => {
    if (!menuOpen) return;

    const handleOutsideClick = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  // Handle section scrolling or navigation to landing sections
  const handleSectionClick = (e, sectionId) => {
    e.preventDefault();
    setMenuOpen(false);

    if (location.pathname === "/") {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      navigate(`/#${sectionId}`);
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    }
  };

  const portalRoute =
    user?.role === "PROFESSIONAL" ? "/professional/dashboard" : "/patient/dashboard";

  return (
    <header
      ref={navRef}
      className={[
        "navbar",
        scrolled ? "navbar--scrolled" : "",
        menuOpen ? "navbar--menu-open" : "",
      ].join(" ")}
      role="banner"
    >
      <nav className="navbar__inner" aria-label="Main navigation">
        {/* Brand Logo */}
        <Link to="/" className="navbar__logo" aria-label="DoctAir home">
          <span className="navbar__logo-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="13" stroke="#0ea5e9" strokeWidth="1.5" />
              <path d="M14 7v14M7 14h14" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" />
              <circle cx="14" cy="14" r="4" fill="#0ea5e9" fillOpacity="0.2" stroke="#38bdf8" strokeWidth="1" />
            </svg>
          </span>
          <span className="navbar__logo-text">DoctAir</span>
        </Link>

        {/* Desktop Navigation Links */}
        <ul className="navbar__links" role="list">
          <li>
            <a
              href="#features"
              onClick={(e) => handleSectionClick(e, "features")}
              className="navbar__link"
            >
              Product
            </a>
          </li>
          <li>
            <a
              href="#how-it-works"
              onClick={(e) => handleSectionClick(e, "how-it-works")}
              className="navbar__link"
            >
              How It Works
            </a>
          </li>
          <li>
            <NavLink
              to="/safety"
              className={({ isActive }) =>
                `navbar__link ${isActive ? "navbar__link--active" : ""}`
              }
            >
              Safety
            </NavLink>
          </li>
          <li>
            <a
              href="#for-teams"
              onClick={(e) => handleSectionClick(e, "for-teams")}
              className="navbar__link"
            >
              For Healthcare Teams
            </a>
          </li>
          <li>
            <NavLink
              to="/about"
              className={({ isActive }) =>
                `navbar__link ${isActive ? "navbar__link--active" : ""}`
              }
            >
              About
            </NavLink>
          </li>
        </ul>

        {/* Desktop Actions */}
        <div className="navbar__actions">
          {user ? (
            <>
              <Link to={portalRoute} className="navbar__workspace-btn">
                Workspace
              </Link>
              <button
                type="button"
                onClick={logout}
                className="navbar__sign-in"
                aria-label="Sign out"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <NavLink
                to="/sign-in"
                className={({ isActive }) =>
                  `navbar__sign-in ${isActive ? "navbar__sign-in--active" : ""}`
                }
              >
                Sign In
              </NavLink>
              <Link to="/sign-up" className="navbar__cta">
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <button
          className={["navbar__hamburger", menuOpen ? "navbar__hamburger--open" : ""].join(" ")}
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav-menu"
          onClick={() => setMenuOpen((v) => !v)}
          type="button"
        >
          <span />
          <span />
          <span />
        </button>
      </nav>

      {/* Mobile Drawer Navigation Menu */}
      <div
        id="mobile-nav-menu"
        className={["navbar__mobile-menu", menuOpen ? "navbar__mobile-menu--open" : ""].join(" ")}
        aria-hidden={!menuOpen}
      >
        <ul className="navbar__mobile-links" role="list">
          <li>
            <a
              href="#features"
              className="navbar__mobile-link"
              onClick={(e) => handleSectionClick(e, "features")}
            >
              Product
            </a>
          </li>
          <li>
            <a
              href="#how-it-works"
              className="navbar__mobile-link"
              onClick={(e) => handleSectionClick(e, "how-it-works")}
            >
              How It Works
            </a>
          </li>
          <li>
            <NavLink
              to="/safety"
              className={({ isActive }) =>
                `navbar__mobile-link ${isActive ? "navbar__mobile-link--active" : ""}`
              }
              onClick={() => setMenuOpen(false)}
            >
              Safety
            </NavLink>
          </li>
          <li>
            <a
              href="#for-teams"
              className="navbar__mobile-link"
              onClick={(e) => handleSectionClick(e, "for-teams")}
            >
              For Healthcare Teams
            </a>
          </li>
          <li>
            <NavLink
              to="/about"
              className={({ isActive }) =>
                `navbar__mobile-link ${isActive ? "navbar__mobile-link--active" : ""}`
              }
              onClick={() => setMenuOpen(false)}
            >
              About
            </NavLink>
          </li>
        </ul>

        <div className="navbar__mobile-actions">
          {user ? (
            <>
              <Link
                to={portalRoute}
                className="navbar__cta"
                onClick={() => setMenuOpen(false)}
              >
                Go to Workspace
              </Link>
              <button
                type="button"
                onClick={() => {
                  if (logout) logout();
                  setMenuOpen(false);
                }}
                className="navbar__sign-in"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <NavLink
                to="/sign-in"
                className={({ isActive }) =>
                  `navbar__sign-in ${isActive ? "navbar__sign-in--active" : ""}`
                }
                onClick={() => setMenuOpen(false)}
              >
                Sign In
              </NavLink>
              <Link
                to="/sign-up"
                className="navbar__cta"
                onClick={() => setMenuOpen(false)}
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
