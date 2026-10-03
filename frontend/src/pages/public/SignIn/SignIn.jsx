import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import './SignIn.css';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const fromLocation = location.state?.from?.pathname;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!email.trim() || !password) {
      setFormError('Please enter both your email address and password.');
      return;
    }

    try {
      setIsSubmitting(true);
      const user = await login({ email: email.trim(), password });

      // Determine appropriate post-login destination
      const defaultTarget =
        user?.role === 'PROFESSIONAL' || user?.role === 'ADMIN'
          ? '/professional/dashboard'
          : '/patient/dashboard';

      const target = fromLocation || defaultTarget;
      navigate(target, { replace: true });
    } catch (err) {
      setFormError(err.message || 'Invalid email or password. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-layout">
      {/* ── Left Column: Brand & Product Visual (Desktop) ────────── */}
      <div className="auth-brand-panel" aria-hidden="true">
        <div className="auth-brand-glow" />
        <div className="auth-brand-inner">
          <Link to="/" className="auth-brand-logo" tabIndex={-1}>
            <svg width="32" height="32" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="13" stroke="#0ea5e9" strokeWidth="1.5" />
              <path d="M14 7v14M7 14h14" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" />
              <circle cx="14" cy="14" r="3.5" fill="#0ea5e9" fillOpacity="0.25" stroke="#38bdf8" strokeWidth="1" />
            </svg>
            <span>DoctAir</span>
          </Link>

          <div className="auth-brand-content">
            <span className="auth-brand-eyebrow">Clinical Intelligence Platform</span>
            <h2 className="auth-brand-headline">
              Smarter health conversations.
              <br />
              <span className="gradient-text">Better clinical review.</span>
            </h2>
            <p className="auth-brand-desc">
              DoctAir structures patient descriptions into organized summaries for qualified healthcare
              professionals with human oversight at every step.
            </p>

            {/* Micro Feature Highlights */}
            <div className="auth-feature-list">
              <div className="auth-feature-item">
                <span className="auth-feature-check">✓</span>
                <span>End-to-end encrypted session security</span>
              </div>
              <div className="auth-feature-item">
                <span className="auth-feature-check">✓</span>
                <span>Structured clinical intake for healthcare teams</span>
              </div>
              <div className="auth-feature-item">
                <span className="auth-feature-check">✓</span>
                <span>Human-in-the-loop clinical review bounds</span>
              </div>
            </div>
          </div>

          <div className="auth-brand-disclaimer">
            DoctAir supports qualified healthcare professionals. It does not replace clinical judgment or diagnosis.
          </div>
        </div>
      </div>

      {/* ── Right Column: Sign In Form ───────────────────────────── */}
      <div className="auth-form-panel">
        <div className="auth-form-container">
          {/* Mobile Brand Link */}
          <div className="auth-mobile-header">
            <Link to="/" className="auth-mobile-logo">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <circle cx="14" cy="14" r="13" stroke="#0ea5e9" strokeWidth="1.5" />
                <path d="M14 7v14M7 14h14" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" />
                <circle cx="14" cy="14" r="3.5" fill="#0ea5e9" fillOpacity="0.25" stroke="#38bdf8" strokeWidth="1" />
              </svg>
              <span>DoctAir</span>
            </Link>
          </div>

          <header className="auth-header">
            <h1 className="auth-title">Welcome back to DoctAir</h1>
            <p className="auth-subtitle">
              Continue your healthcare journey with a secure, human-reviewed care workflow.
            </p>
          </header>

          {/* Error Message Box */}
          {formError && (
            <div className="auth-error-banner" role="alert">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <circle cx="10" cy="10" r="9" stroke="#ef4444" strokeWidth="1.5" />
                <path d="M10 6v5M10 14v.5" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span>{formError}</span>
            </div>
          )}

          {/* Form */}
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="auth-input-group">
              <label htmlFor="signin-email">Email Address</label>
              <input
                id="signin-email"
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="auth-input"
                disabled={isSubmitting}
              />
            </div>

            <div className="auth-input-group">
              <div className="auth-label-row">
                <label htmlFor="signin-password">Password</label>
              </div>
              <div className="auth-password-wrapper">
                <input
                  id="signin-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="auth-input auth-input--password"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={0}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="auth-spinner" aria-hidden="true" />
                  Signing in...
                </>
              ) : (
                'Sign In to DoctAir'
              )}
            </button>
          </form>

          {/* Footer */}
          <footer className="auth-footer">
            <p>
              Don't have an account?{' '}
              <Link to="/sign-up" className="auth-accent-link">
                Sign up
              </Link>
            </p>
            <div className="auth-return">
              <Link to="/" className="auth-return-link">
                &larr; Return to DoctAir overview
              </Link>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
