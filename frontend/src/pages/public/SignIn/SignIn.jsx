import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import "./SignIn.css";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth() || {};
  const navigate = useNavigate();
  const location = useLocation();

  // If redirected from a protected route, state.from has the target
  const fromLocation = location.state?.from?.pathname;

  // Development role simulation helper to allow previewing protected views
  const handleSimulateLogin = (role) => {
    if (login) {
      login({
        id: "mock-user-1",
        name: role === "PROFESSIONAL" ? "Dr. Sarah Chen, MD" : "Alex Johnson",
        email: email || (role === "PROFESSIONAL" ? "sarah.chen@clinic.org" : "alex@example.com"),
        role: role,
      });
    }
    const defaultTarget = role === "PROFESSIONAL" ? "/professional/dashboard" : "/patient/dashboard";
    const target = fromLocation || defaultTarget;
    navigate(target, { replace: true });
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Header */}
        <div className="auth-card__header">
          <Link to="/" className="auth-card__logo" aria-label="DoctAir home">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="13" stroke="#0ea5e9" strokeWidth="1.5" />
              <path d="M14 7v14M7 14h14" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" />
              <circle cx="14" cy="14" r="3.5" fill="#0ea5e9" fillOpacity="0.25" stroke="#38bdf8" strokeWidth="1" />
            </svg>
            <span>DoctAir</span>
          </Link>
          <h1 className="auth-card__title">Sign In to DoctAir</h1>
          <p className="auth-card__subtitle">
            Access your secure patient workspace or clinical review portal.
          </p>
        </div>

        {/* Form Placeholder */}
        <form className="auth-form" onSubmit={(e) => e.preventDefault()}>
          <div className="auth-form__group">
            <label htmlFor="signin-email">Email Address</label>
            <input
              id="signin-email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-form__input"
            />
          </div>

          <div className="auth-form__group">
            <div className="auth-form__label-row">
              <label htmlFor="signin-password">Password</label>
              <span className="auth-form__forgot">Forgot password?</span>
            </div>
            <input
              id="signin-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-form__input"
            />
          </div>

          <div className="auth-form__status-note">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="7" stroke="#38bdf8" strokeWidth="1.2" />
              <path d="M8 5v3.5M8 11v.5" stroke="#38bdf8" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <span>Full authentication service connects in next task. Use preview below to test workspaces.</span>
          </div>

          {/* Quick workspace preview buttons */}
          <div className="auth-form__preview-actions">
            <button
              type="button"
              className="btn-primary w-full"
              onClick={() => handleSimulateLogin("PATIENT")}
            >
              Sign In as Patient (Preview)
            </button>
            <button
              type="button"
              className="btn-ghost w-full"
              onClick={() => handleSimulateLogin("PROFESSIONAL")}
            >
              Sign In as Healthcare Professional (Preview)
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="auth-card__footer">
          <p>
            Don't have an account?{" "}
            <Link to="/sign-up" className="auth-link">
              Get Started
            </Link>
          </p>
          <div className="auth-card__back">
            <Link to="/" className="auth-back-link">
              &larr; Back to DoctAir Overview
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
