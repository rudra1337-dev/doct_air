import { useRef, useEffect } from 'react';

export default function ChatInput({
  value = '',
  onChange,
  onSend,
  disabled = false,
  isStreaming = false,
}) {
  const textareaRef = useRef(null);

  // Auto-resize textarea height as content expands
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 140);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [value]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled && !isStreaming) {
        onSend();
      }
    }
  };

  const isSendDisabled = disabled || isStreaming || !value.trim();

  return (
    <div className="chat-input-wrapper">
      <form
        className="chat-input-container"
        onSubmit={(e) => {
          e.preventDefault();
          if (!isSendDisabled) {
            onSend();
          }
        }}
      >
        <textarea
          ref={textareaRef}
          className="chat-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isStreaming
              ? 'Assistant is responding...'
              : 'Message DoctAir (describe symptoms or medical questions)...'
          }
          rows={1}
          disabled={disabled || isStreaming}
          aria-label="Message input"
        />

        <button
          type="submit"
          className="chat-send-btn"
          disabled={isSendDisabled}
          aria-label={isStreaming ? 'Generating response' : 'Send message'}
          title={isStreaming ? 'Assistant responding' : 'Send message (Enter)'}
        >
          {isStreaming ? (
            <div className="chat-send-spinner" aria-hidden="true" />
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="19" x2="12" y2="5" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="5 12 12 5 19 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </form>

      <div className="chat-disclaimer">
        <span>
          DoctAir AI provides intake assistance and health information. Not a substitute for professional diagnosis.
        </span>
      </div>
    </div>
  );
}
