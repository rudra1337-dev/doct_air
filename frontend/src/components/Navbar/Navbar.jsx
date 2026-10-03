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

  const { user, isAuthenticated, logout } = useAuth();

  // Scroll effect for navbar background blur
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Reset mobile menu on route change
  const [prevPath, setPrevPath] = useState(location.pathname);
  if (prevPath !== location.pathname) {
    setPrevPath(location.pathname);
    setMenuOpen(false);
  }

  // Outside click & Escape key listener
  useEffect(() => {
    if (!menuOpen) return;

    const handleOutsideClick = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
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

  // Smooth scroll handler for landing page anchors
  const handleSectionClick = (e, sectionId) => {
    e.preventDefault();
    setMenuOpen(false);

    if (location.pathname === "/") {
      const element = document.getElementById(sectionId);
      if (element) element.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate(`/#${sectionId}`);
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) element.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate("/", { replace: true });
  };

  const isProfessionalOrAdmin = user?.role === "PROFESSIONAL" || user?.role === "ADMIN";

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

        {/* Desktop Links (Dynamic by Auth State & Role) */}
        <ul className="navbar__links" role="list">
          {isAuthenticated && user ? (
            isProfessionalOrAdmin ? (
              /* Professional / Admin Navigation */
              <>
                <li>
                  <NavLink
                    to="/professional/dashboard"
                    className={({ isActive }) =>
                      `navbar__link ${isActive ? "navbar__link--active" : ""}`
                    }
                  >
                    Dashboard
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/professional/queue"
                    className={({ isActive }) =>
                      `navbar__link ${isActive ? "navbar__link--active" : ""}`
                    }
                  >
                    Queue
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/professional/cases"
                    className={({ isActive }) =>
                      `navbar__link ${isActive ? "navbar__link--active" : ""}`
                    }
                  >
                    Cases
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/professional/profile"
                    className={({ isActive }) =>
                      `navbar__link ${isActive ? "navbar__link--active" : ""}`
                    }
                  >
                    Profile
                  </NavLink>
                </li>
              </>
            ) : (
              /* Patient Navigation */
              <>
                <li>
                  <NavLink
                    to="/patient/dashboard"
                    className={({ isActive }) =>
                      `navbar__link ${isActive ? "navbar__link--active" : ""}`
                    }
                  >
                    Dashboard
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/patient/consultation"
                    className={({ isActive }) =>
                      `navbar__link ${isActive ? "navbar__link--active" : ""}`
                    }
                  >
                    Consultation
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/patient/cases"
                    className={({ isActive }) =>
                      `navbar__link ${isActive ? "navbar__link--active" : ""}`
                    }
                  >
                    Cases
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/patient/profile"
                    className={({ isActive }) =>
                      `navbar__link ${isActive ? "navbar__link--active" : ""}`
                    }
                  >
                    Profile
                  </NavLink>
                </li>
              </>
            )
          ) : (
            /* Logged Out / Public Navigation */
            <>
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
                <NavLink
                  to="/about"
                  className={({ isActive }) =>
                    `navbar__link ${isActive ? "navbar__link--active" : ""}`
                  }
                >
                  About
                </NavLink>
              </li>
            </>
          )}
        </ul>

        {/* Desktop Actions */}
        <div className="navbar__actions">
          {isAuthenticated && user ? (
            <div className="navbar__user-group">
              <span className={`navbar__user-badge ${isProfessionalOrAdmin ? "navbar__user-badge--pro" : ""}`}>
                {user.role === "ADMIN" ? "Admin" : isProfessionalOrAdmin ? "Clinical" : "Patient"}
              </span>
              <span className="navbar__user-name" title={user.email}>
                {user.name}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="navbar__logout-btn"
                aria-label="Sign out"
              >
                Sign Out
              </button>
            </div>
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

        {/* Mobile Hamburger */}
        <button
          className={["navbar__hamburger", menuOpen ? "navbar__hamburger--open" : ""].join(" ")}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
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

      {/* Mobile Drawer Menu */}
      <div
        id="mobile-nav-menu"
        className={["navbar__mobile-menu", menuOpen ? "navbar__mobile-menu--open" : ""].join(" ")}
        aria-hidden={!menuOpen}
      >
        <ul className="navbar__mobile-links" role="list">
          {isAuthenticated && user ? (
            isProfessionalOrAdmin ? (
              /* Mobile Professional / Admin Links */
              <>
                <li>
                  <NavLink
                    to="/professional/dashboard"
                    className={({ isActive }) =>
                      `navbar__mobile-link ${isActive ? "navbar__mobile-link--active" : ""}`
                    }
                    onClick={() => setMenuOpen(false)}
                  >
                    Dashboard
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/professional/queue"
                    className={({ isActive }) =>
                      `navbar__mobile-link ${isActive ? "navbar__mobile-link--active" : ""}`
                    }
                    onClick={() => setMenuOpen(false)}
                  >
                    Queue
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/professional/cases"
                    className={({ isActive }) =>
                      `navbar__mobile-link ${isActive ? "navbar__mobile-link--active" : ""}`
                    }
                    onClick={() => setMenuOpen(false)}
                  >
                    Cases
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/professional/profile"
                    className={({ isActive }) =>
                      `navbar__mobile-link ${isActive ? "navbar__mobile-link--active" : ""}`
                    }
                    onClick={() => setMenuOpen(false)}
                  >
                    Profile
                  </NavLink>
                </li>
              </>
            ) : (
              /* Mobile Patient Links */
              <>
                <li>
                  <NavLink
                    to="/patient/dashboard"
                    className={({ isActive }) =>
                      `navbar__mobile-link ${isActive ? "navbar__mobile-link--active" : ""}`
                    }
                    onClick={() => setMenuOpen(false)}
                  >
                    Dashboard
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/patient/consultation"
                    className={({ isActive }) =>
                      `navbar__mobile-link ${isActive ? "navbar__mobile-link--active" : ""}`
                    }
                    onClick={() => setMenuOpen(false)}
                  >
                    Consultation
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/patient/cases"
                    className={({ isActive }) =>
                      `navbar__mobile-link ${isActive ? "navbar__mobile-link--active" : ""}`
                    }
                    onClick={() => setMenuOpen(false)}
                  >
                    Cases
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/patient/profile"
                    className={({ isActive }) =>
                      `navbar__mobile-link ${isActive ? "navbar__mobile-link--active" : ""}`
                    }
                    onClick={() => setMenuOpen(false)}
                  >
                    Profile
                  </NavLink>
                </li>
              </>
            )
          ) : (
            /* Mobile Public Links */
            <>
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
            </>
          )}
        </ul>

        {/* Mobile Actions */}
        <div className="navbar__mobile-actions">
          {isAuthenticated && user ? (
            <>
              <div className="navbar__mobile-user-info">
                <span className={`navbar__user-badge ${isProfessionalOrAdmin ? "navbar__user-badge--pro" : ""}`}>
                  {user.role}
                </span>
                <span className="navbar__mobile-user-name">{user.name}</span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
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
