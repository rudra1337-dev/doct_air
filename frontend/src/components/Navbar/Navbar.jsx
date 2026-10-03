import { useState, useEffect } from "react";
import "./Navbar.css";

const NAV_LINKS = [
  { label: "Product",              href: "#features"   },
  { label: "How It Works",         href: "#how-it-works"},
  { label: "Safety",               href: "#safety"     },
  { label: "For Healthcare Teams", href: "#for-teams"  },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={[
        "navbar",
        scrolled ? "navbar--scrolled" : "",
      ].join(" ")}
      role="banner"
    >
      <nav className="navbar__inner" aria-label="Main navigation">
        {/* Logo */}
        <a href="/" className="navbar__logo" aria-label="DoctAir home">
          <span className="navbar__logo-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="13" stroke="#0ea5e9" strokeWidth="1.5" />
              <path d="M14 7v14M7 14h14" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="14" cy="14" r="4" fill="#0ea5e9" fillOpacity="0.2" stroke="#38bdf8" strokeWidth="1"/>
            </svg>
          </span>
          <span className="navbar__logo-text">DoctAir</span>
        </a>

        {/* Desktop links */}
        <ul className="navbar__links" role="list">
          {NAV_LINKS.map((l) => (
            <li key={l.label}>
              <a href={l.href} className="navbar__link">{l.label}</a>
            </li>
          ))}
        </ul>

        {/* Desktop CTAs */}
        <div className="navbar__actions">
          <a href="/login" className="navbar__sign-in">Sign In</a>
          <a href="/signup" className="navbar__cta">Get Started</a>
        </div>

        {/* Mobile hamburger */}
        <button
          className={["navbar__hamburger", menuOpen ? "navbar__hamburger--open" : ""].join(" ")}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span /><span /><span />
        </button>
      </nav>

      {/* Mobile menu */}
      <div
        className={["navbar__mobile-menu", menuOpen ? "navbar__mobile-menu--open" : ""].join(" ")}
        aria-hidden={!menuOpen}
      >
        {NAV_LINKS.map((l) => (
          <a
            key={l.label}
            href={l.href}
            className="navbar__mobile-link"
            onClick={() => setMenuOpen(false)}
          >
            {l.label}
          </a>
        ))}
        <div className="navbar__mobile-actions">
          <a href="/login" className="navbar__sign-in">Sign In</a>
          <a href="/signup" className="navbar__cta">Get Started</a>
        </div>
      </div>
    </header>
  );
}
