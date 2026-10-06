import { useRef, useEffect } from 'react';
import { combineText } from '../../../../hooks/useSpeechRecognition.js';

export default function ChatInput({
  value = '',
  onChange,
  onSend,
  disabled = false,
  isStreaming = false,
  speechRecognitionSupported = false,
  voiceState = 'idle',
  onToggleVoice,
  voiceError = null,
  interimTranscript = '',
}) {
  const textareaRef = useRef(null);

  const isListening = voiceState === 'listening';
  const isStopping = voiceState === 'stopping';

  // Live text displayed in composer (base text + live interim speech while listening)
  const displayValue =
    isListening && interimTranscript ? combineText(value, interimTranscript) : value;

  // Auto-resize textarea height as content expands
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 140);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [displayValue]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (displayValue.trim() && !disabled && !isStreaming) {
        onSend(displayValue);
      }
    }
  };

  const isSendDisabled = disabled || isStreaming || !displayValue.trim();

  // Dynamic placeholder adapting to conversation and voice state
  let placeholderText = 'Message DoctAir (describe symptoms or medical questions)...';
  if (isListening) {
    placeholderText = displayValue
      ? ''
      : 'Listening... Speak clearly into your microphone';
  } else if (isStopping) {
    placeholderText = 'Stopping voice input...';
  } else if (isStreaming) {
    placeholderText = 'Assistant is responding...';
  }

  return (
    <div className="chat-input-wrapper">
      {/* Voice Error Notice */}
      {voiceError && (
        <div className="chat-input-voice-error" role="alert">
          <span>{voiceError}</span>
        </div>
      )}

      <form
        className={`chat-input-container ${isListening ? 'chat-input-container--listening' : ''}`}
        onSubmit={(e) => {
          e.preventDefault();
          if (!isSendDisabled) {
            onSend(displayValue);
          }
        }}
      >
        <textarea
          ref={textareaRef}
          className="chat-textarea"
          value={displayValue}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholderText}
          rows={1}
          disabled={disabled || isStreaming}
          aria-label="Message input"
        />

        {/* Push-to-Talk Microphone Button (only if Speech Recognition is supported) */}
        {speechRecognitionSupported && onToggleVoice && (
          <button
            type="button"
            className={`chat-mic-btn ${isListening ? 'chat-mic-btn--listening' : ''} ${
              isStopping ? 'chat-mic-btn--stopping' : ''
            }`}
            onClick={onToggleVoice}
            disabled={disabled || isStreaming || isStopping}
            aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
            title={
              isListening
                ? 'Listening... Click to stop voice input'
                : isStopping
                ? 'Stopping voice input...'
                : 'Start voice input'
            }
            aria-pressed={isListening}
          >
            {isStopping ? (
              <div className="chat-mic-spinner" aria-hidden="true" />
            ) : isListening ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <rect x="5" y="5" width="14" height="14" rx="2" />
              </svg>
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
            )}
          </button>
        )}

        {/* Message Send Button */}
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
