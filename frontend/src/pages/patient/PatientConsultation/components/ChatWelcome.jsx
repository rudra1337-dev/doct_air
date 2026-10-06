export default function ChatWelcome({ patientName = '', onSelectPrompt }) {
  const suggestions = [
    {
      title: 'Persistent Headache',
      desc: "I've had a throbbing tension headache for the past 2 days.",
    },
    {
      title: 'Fever & Cough',
      desc: 'Experiencing a low-grade fever with a dry cough and fatigue.',
    },
    {
      title: 'Digestive Discomfort',
      desc: 'Mild stomach cramping and bloating after meals since yesterday.',
    },
    {
      title: 'Joint Stiffness',
      desc: 'Waking up with knee stiffness that eases after light movement.',
    },
  ];

  return (
    <div className="chat-welcome">
      <div className="chat-welcome__inner">
        <div className="chat-welcome__badge">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v20M2 12h20" strokeLinecap="round" />
          </svg>
          <span>Clinical Intake Assistant</span>
        </div>

        <h2 className="chat-welcome__title">
          Hello{patientName ? `, ${patientName.split(' ')[0]}` : ''}. How are you feeling today?
        </h2>

        <p className="chat-welcome__subtitle">
          Describe your symptoms, concerns, or medical questions in your own words. I will help organize your health history and prepare structured insights for your care team.
        </p>

        {/* Emergency Disclaimer Banner */}
        <div className="chat-welcome__emergency-banner" role="alert">
          <div className="emergency-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div className="emergency-text">
            <strong>Emergency Notice:</strong> If you are experiencing chest pain, difficulty breathing, sudden weakness, or an emergency, call <strong>911</strong> or visit the nearest ER immediately.
          </div>
        </div>

        {/* Prompt Suggestions */}
        <div className="chat-welcome__suggestions">
          <span className="suggestions-label">Common starting points:</span>
          <div className="suggestions-grid">
            {suggestions.map((item, idx) => (
              <button
                key={idx}
                type="button"
                className="suggestion-chip"
                onClick={() => onSelectPrompt(item.desc)}
              >
                <span className="suggestion-chip__title">{item.title}</span>
                <span className="suggestion-chip__desc">{item.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
