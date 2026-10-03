import "./Footer.css";

const LINKS = {
  Product:   ["Features", "How It Works", "Safety", "For Healthcare Teams"],
  Resources: ["Documentation", "API Reference", "Case Studies"],
  Legal:     ["Privacy Policy", "Terms of Service", "Responsible AI"],
  Company:   ["About", "Contact", "Careers"],
};

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer" role="contentinfo">
      <div className="footer__container">
        <div className="footer__top">
          {/* Brand */}
          <div className="footer__brand">
            <a href="/" className="footer__logo" aria-label="DoctAir home">
              <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
                <circle cx="13" cy="13" r="12" stroke="#0ea5e9" strokeWidth="1.5"/>
                <path d="M13 7v12M7 13h12" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="13" cy="13" r="3.5" fill="rgba(14,165,233,0.2)" stroke="#38bdf8" strokeWidth="1"/>
              </svg>
              <span>DoctAir</span>
            </a>
            <p className="footer__tagline">
              AI-assisted healthcare conversations.
              <br />Built for better clinical review.
            </p>
            <p className="footer__disclaimer">
              DoctAir supports healthcare professionals.
              It does not replace clinical judgment or diagnosis.
            </p>
          </div>

          {/* Links */}
          <nav className="footer__links" aria-label="Footer navigation">
            {Object.entries(LINKS).map(([category, items]) => (
              <div className="footer__link-group" key={category}>
                <h3 className="footer__link-heading">{category}</h3>
                <ul role="list">
                  {items.map((item) => (
                    <li key={item}>
                      <a href="#" className="footer__link">{item}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* Bottom bar */}
        <div className="footer__bottom">
          <p className="footer__copy">
            &copy; {year} DoctAir. All rights reserved.
          </p>
          <p className="footer__legal">
            For informational and professional support purposes only.
            Not a substitute for professional medical advice.
          </p>
        </div>
      </div>
    </footer>
  );
}
