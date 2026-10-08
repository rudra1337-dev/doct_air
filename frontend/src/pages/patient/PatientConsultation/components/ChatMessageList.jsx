import { useEffect, useRef } from 'react';

export default function ChatMessageList({
  messages = [],
  isLoading = false,
  error = null,
  isStreaming = false,
  onRetry,
  onRetryLoading,
  onNewChat,
  speechSynthesisSupported = false,
  activeSpeakingId = null,
  onToggleSpeak,
}) {
  const bottomRef = useRef(null);

  // Auto-scroll on new messages or chunk updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const formatMsgTime = (timestamp) => {
    if (!timestamp) return '';
    try {
      return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="chat-messages chat-messages--loading" role="status" aria-label="Loading messages">
        <div className="chat-loading-spinner">
          <div className="spinner-ring" />
          <span>Loading consultation session...</span>
        </div>
      </div>
    );
  }

  // Error State for loading conversation
  if (error) {
    return (
      <div className="chat-messages chat-messages__error" role="alert">
        <div className="chat-error-card">
          <div className="emergency-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h3>Failed to Load Consultation</h3>
          <p>{error}</p>
          <div className="chat-error-actions">
            {onRetryLoading && (
              <button
                type="button"
                className="chat-error-btn-primary"
                onClick={onRetryLoading}
              >
                Retry Loading
              </button>
            )}
            {onNewChat && (
              <button
                type="button"
                className="chat-error-btn-secondary"
                onClick={onNewChat}
              >
                Start New Consultation
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Empty State for an open conversation with no messages yet
  if (!isLoading && messages.length === 0) {
    return (
      <div className="chat-messages chat-messages__empty-conv">
        <div className="empty-conv-icon" aria-hidden="true">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="1.5">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        </div>
        <h3>Consultation Session Ready</h3>
        <p>
          Describe your symptoms, questions, or medical concerns below to begin your clinical intake dialog.
        </p>
      </div>
    );
  }

  return (
    <div className="chat-messages" role="log" aria-live="polite">
      <div className="chat-messages__inner">
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          const isCurrentlyStreaming = msg.status === 'streaming';
          const isFailed = msg.status === 'failed';
          const isSending = msg.status === 'sending';

          const messageId = msg.id || `msg-${index}`;
          const isSpeakingThis = activeSpeakingId === messageId;

          return (
            <div
              key={messageId}
              className={`chat-bubble-row ${isUser ? 'chat-bubble-row--user' : 'chat-bubble-row--assistant'}`}
            >
              {/* Avatar */}
              <div className={`chat-avatar ${isUser ? 'chat-avatar--user' : 'chat-avatar--assistant'}`}>
                {isUser ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 28 28" fill="none">
                    <circle cx="14" cy="14" r="13" stroke="#0ea5e9" strokeWidth="1.5" />
                    <path d="M14 7v14M7 14h14" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="14" cy="14" r="3.5" fill="#0ea5e9" fillOpacity="0.25" stroke="#38bdf8" strokeWidth="1" />
                  </svg>
                )}
              </div>

              {/* Bubble Container */}
              <div className="chat-bubble-container">
                <div className="chat-bubble-header">
                  <span className="chat-bubble-sender">
                    {isUser ? 'You' : 'DoctAir Assistant'}
                  </span>
                  {msg.createdAt && (
                    <span className="chat-bubble-time">{formatMsgTime(msg.createdAt)}</span>
                  )}
                </div>

                <div
                  className={`chat-bubble ${isUser ? 'chat-bubble--user' : 'chat-bubble--assistant'} ${
                    isFailed ? 'chat-bubble--failed' : ''
                  }`}
                >
                  {/* Message Content */}
                  <div className="chat-bubble-text">
                    {msg.content}
                    {isCurrentlyStreaming && <span className="streaming-cursor" aria-hidden="true" />}
                  </div>

                  {/* Sending state badge */}
                  {isSending && (
                    <span className="chat-bubble-status">Sending...</span>
                  )}

                  {/* Failure State & Retry */}
                  {isFailed && (
                    <div className="chat-bubble-error">
                      <div className="error-note">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span>Response could not be completed.</span>
                      </div>
                      {onRetry && (
                        <button
                          type="button"
                          className="chat-retry-btn"
                          onClick={() => onRetry(msg)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="1 4 1 10 7 10" />
                            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                          </svg>
                          Retry
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Assistant Message Actions: Speak Aloud (TTS) */}
                {!isUser && !isCurrentlyStreaming && !isFailed && !isSending && Boolean(msg.content) && speechSynthesisSupported && (
                  <div className="chat-bubble-actions">
                    <button
                      type="button"
                      className={`chat-speaker-btn ${isSpeakingThis ? 'chat-speaker-btn--speaking' : ''}`}
                      onClick={() => onToggleSpeak && onToggleSpeak(messageId, msg.content)}
                      aria-label={isSpeakingThis ? 'Stop reading assistant response' : 'Read assistant response aloud'}
                      aria-pressed={isSpeakingThis}
                      title={isSpeakingThis ? 'Stop reading assistant response' : 'Read assistant response aloud'}
                    >
                      {isSpeakingThis ? (
                        <>
                          <span className="chat-speaker-bars" aria-hidden="true">
                            <span className="speaker-bar bar-1" />
                            <span className="speaker-bar bar-2" />
                            <span className="speaker-bar bar-3" />
                          </span>
                          <svg
                            className="chat-speaker-icon"
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            stroke="none"
                            aria-hidden="true"
                          >
                            <rect x="5" y="5" width="14" height="14" rx="2" />
                          </svg>
                          <span className="chat-speaker-label">Stop</span>
                        </>
                      ) : (
                        <>
                          <svg
                            className="chat-speaker-icon"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                          </svg>
                          <span className="chat-speaker-label">Read aloud</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} style={{ height: 16 }} />
      </div>
    </div>
  );
}
