import { useEffect, useRef } from 'react';

export default function ChatMessageList({
  messages = [],
  isLoading = false,
  isStreaming = false,
  onRetry,
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

  if (isLoading) {
    return (
      <div className="chat-messages chat-messages--loading">
        <div className="chat-loading-spinner">
          <div className="spinner-ring" />
          <span>Loading consultation session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-messages" role="log" aria-live="polite">
      {messages.map((msg, index) => {
        const isUser = msg.role === 'user';
        const isCurrentlyStreaming = msg.status === 'streaming';
        const isFailed = msg.status === 'failed';
        const isSending = msg.status === 'sending';

        return (
          <div
            key={msg.id || `msg-${index}`}
            className={`chat-bubble-row ${isUser ? 'chat-bubble-row--user' : 'chat-bubble-row--assistant'}`}
          >
            {/* Avatar */}
            <div className={`chat-avatar ${isUser ? 'chat-avatar--user' : 'chat-avatar--assistant'}`}>
              {isUser ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 28 28" fill="none">
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
                  {isUser ? 'You' : 'DoctAir Clinical Assistant'}
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
            </div>
          </div>
        );
      })}

      <div ref={bottomRef} style={{ height: 1 }} />
    </div>
  );
}
