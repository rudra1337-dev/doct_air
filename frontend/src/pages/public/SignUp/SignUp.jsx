import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import "../SignIn/SignIn.css";

export default function SignUp() {
  const [role, setRole] = useState("PATIENT");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth() || {};
  const navigate = useNavigate();

  const handleSimulateSignup = (selectedRole) => {
    const assignedRole = selectedRole || role;
    if (login) {
      login({
        id: "mock-user-" + Date.now(),
        name: name || (assignedRole === "PROFESSIONAL" ? "Dr. Healthcare Clinician" : "New Patient"),
        email: email || (assignedRole === "PROFESSIONAL" ? "provider@clinic.org" : "patient@example.com"),
        role: assignedRole,
      });
    }
    const target = assignedRole === "PROFESSIONAL" ? "/professional/dashboard" : "/patient/dashboard";
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
          <h1 className="auth-card__title">Create your Account</h1>
          <p className="auth-card__subtitle">
            Join DoctAir for guided health conversations and structured clinical review.
          </p>
        </div>

        {/* Role Selector */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
          <button
            type="button"
            className={role === "PATIENT" ? "btn-primary" : "btn-ghost"}
            style={{ flex: 1, fontSize: "0.85rem", padding: "0.6rem" }}
            onClick={() => setRole("PATIENT")}
          >
            I am a Patient
          </button>
          <button
            type="button"
            className={role === "PROFESSIONAL" ? "btn-primary" : "btn-ghost"}
            style={{ flex: 1, fontSize: "0.85rem", padding: "0.6rem" }}
            onClick={() => setRole("PROFESSIONAL")}
          >
            Healthcare Team
          </button>
        </div>

        {/* Form Placeholder */}
        <form className="auth-form" onSubmit={(e) => e.preventDefault()}>
          <div className="auth-form__group">
            <label htmlFor="signup-name">Full Name</label>
            <input
              id="signup-name"
              type="text"
              placeholder={role === "PROFESSIONAL" ? "Dr. Alex Taylor, MD" : "Jane Doe"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="auth-form__input"
            />
          </div>

          <div className="auth-form__group">
            <label htmlFor="signup-email">Email Address</label>
            <input
              id="signup-email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-form__input"
            />
          </div>

          <div className="auth-form__group">
            <label htmlFor="signup-password">Create Password</label>
            <input
              id="signup-password"
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
            <span>Registration backend connects in next task. Click below to test workspace routing.</span>
          </div>

          <button
            type="button"
            className="btn-primary w-full"
            onClick={() => handleSimulateSignup(role)}
          >
            Create Account & Enter {role === "PROFESSIONAL" ? "Clinical Portal" : "Patient Portal"}
          </button>
        </form>

        {/* Footer */}
        <div className="auth-card__footer">
          <p>
            Already have an account?{" "}
            <Link to="/sign-in" className="auth-link">
              Sign In
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
