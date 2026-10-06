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
              : 'Describe your symptoms, health concerns, or ask a question...'
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </button>
      </form>

      <div className="chat-disclaimer">
        <span>
          DoctAir AI provides conversational intake and information. Not a licensed healthcare diagnosis.
        </span>
      </div>
    </div>
  );
}
