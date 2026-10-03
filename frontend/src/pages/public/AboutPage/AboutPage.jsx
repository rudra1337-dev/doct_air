import { Link } from "react-router-dom";
import "./AboutPage.css";

export default function AboutPage() {
  return (
    <div className="about-page">
      <div className="about-page__container">
        {/* Header */}
        <header className="about-page__header">
          <div className="about-page__badge">
            <span className="about-page__badge-dot" aria-hidden="true" />
            Our Mission
          </div>
          <h1 className="about-page__title">
            Bridging Patient Voice & <span className="gradient-text">Clinical Review.</span>
          </h1>
          <p className="about-page__subtitle">
            DoctAir was founded to solve a fundamental healthcare challenge: clinical consultations
            are often constrained by time, leading to fragmented patient narratives and doctor burnout.
          </p>
        </header>

        {/* Story Section */}
        <section className="about-page__story">
          <div className="about-page__story-card">
            <h2>The Problem in Healthcare Intake</h2>
            <p>
              When patients prepare for appointments, recalling symptom timelines, medication dosages,
              and subtle clinical changes is difficult under pressure. Healthcare providers typically have
              less than 15 minutes per consultation, spending disproportionate time gathering intake history
              and documenting notes rather than engaging directly with patients.
            </p>
          </div>

          <div className="about-page__story-card">
            <h2>The DoctAir Solution</h2>
            <p>
              DoctAir provides an empathetic, conversational interface where patients can comfortably describe
              their concerns in their own words. Our system organizes this dialogue into structured, standardized
              clinical intake summaries — highlighting chief complaints, symptom trajectories, and medication
              histories for qualified clinicians before review.
            </p>
          </div>
        </section>

        {/* Guiding Principles */}
        <section className="about-page__values">
          <h2 className="about-page__values-heading">Our Guiding Principles</h2>
          <div className="about-page__values-grid">
            <div className="about-page__value-item">
              <span className="about-page__value-num">01</span>
              <h3>Clinician in the Driver's Seat</h3>
              <p>Technology should elevate human expertise. Every medical decision remains exclusively with qualified healthcare professionals.</p>
            </div>
            <div className="about-page__value-item">
              <span className="about-page__value-num">02</span>
              <h3>Patient-Centric Empathy</h3>
              <p>Patients are empowered to express their health story without feeling rushed, in accessible and considerate language.</p>
            </div>
            <div className="about-page__value-item">
              <span className="about-page__value-num">03</span>
              <h3>Rigorous Clinical Safety</h3>
              <p>Every algorithm is built around safety bounds, clear clinical disclosures, and zero tolerance for autonomous medical diagnosis.</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="about-page__cta">
          <h2>Ready to explore DoctAir?</h2>
          <div className="about-page__cta-actions">
            <Link to="/sign-up" className="btn-primary">
              Get Started
            </Link>
            <Link to="/safety" className="btn-ghost">
              Read Safety Commitments
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
