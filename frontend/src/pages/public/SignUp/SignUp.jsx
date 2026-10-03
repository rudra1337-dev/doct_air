import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import '../SignIn/SignIn.css';

export default function SignUp() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    // Client-side validations
    if (!name.trim()) {
      setFormError('Please enter your full name.');
      return;
    }

    if (!email.trim()) {
      setFormError('Please enter your email address.');
      return;
    }

    if (!password) {
      setFormError('Please enter a secure password.');
      return;
    }

    if (password.length < 8) {
      setFormError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match. Please verify both fields.');
      return;
    }

    try {
      setIsSubmitting(true);
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
        confirmPassword,
      });

      // New public registrations automatically navigate to patient dashboard
      navigate('/patient/dashboard', { replace: true });
    } catch (err) {
      setFormError(err.message || 'Registration failed. Please check your information and try again.');
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
            <span className="auth-brand-eyebrow">Patient Intake & Clinical Review</span>
            <h2 className="auth-brand-headline">
              Describe your health in words.
              <br />
              <span className="gradient-text">Reviewed by professionals.</span>
            </h2>
            <p className="auth-brand-desc">
              Create your secure patient account. Prepare for upcoming consultations with guided,
              unhurried health conversations structured for your doctor.
            </p>

            <div className="auth-feature-list">
              <div className="auth-feature-item">
                <span className="auth-feature-check">✓</span>
                <span>Personalized symptom and history intake</span>
              </div>
              <div className="auth-feature-item">
                <span className="auth-feature-check">✓</span>
                <span>Zero clinical diagnosis without licensed human review</span>
              </div>
              <div className="auth-feature-item">
                <span className="auth-feature-check">✓</span>
                <span>Secure, private, and HIPAA-conscious data handling</span>
              </div>
            </div>
          </div>

          <div className="auth-brand-disclaimer">
            DoctAir is a decision-support and intake platform. It does not replace medical consultation.
          </div>
        </div>
      </div>

      {/* ── Right Column: Sign Up Form ───────────────────────────── */}
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
            <h1 className="auth-title">Create your Account</h1>
            <p className="auth-subtitle">
              Get started with guided, human-reviewed health conversations.
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
              <label htmlFor="signup-name">Full Name</label>
              <input
                id="signup-name"
                type="text"
                autoComplete="name"
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="auth-input"
                disabled={isSubmitting}
              />
            </div>

            <div className="auth-input-group">
              <label htmlFor="signup-email">Email Address</label>
              <input
                id="signup-email"
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
              <label htmlFor="signup-password">Password (minimum 8 characters)</label>
              <div className="auth-password-wrapper">
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
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

            <div className="auth-input-group">
              <label htmlFor="signup-confirm-password">Confirm Password</label>
              <div className="auth-password-wrapper">
                <input
                  id="signup-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="auth-input auth-input--password"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  tabIndex={0}
                >
                  {showConfirmPassword ? (
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

            <p className="auth-terms-note">
              By creating an account, you agree to DoctAir's clinical decision-support boundaries and privacy protocols.
            </p>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="auth-spinner" aria-hidden="true" />
                  Creating your account...
                </>
              ) : (
                'Create Patient Account'
              )}
            </button>
          </form>

          {/* Footer */}
          <footer className="auth-footer">
            <p>
              Already have an account?{' '}
              <Link to="/sign-in" className="auth-accent-link">
                Sign in
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
