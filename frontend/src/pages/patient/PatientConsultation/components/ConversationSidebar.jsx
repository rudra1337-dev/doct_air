import { formatConversationDate } from '../../../../utils/formatDate';

export default function ConversationSidebar({
  conversations = [],
  activeId = null,
  onSelect,
  onNewChat,
  isLoading = false,
  error = null,
  onRetry,
  isOpen = false,
  onClose,
  isDesktopOpen = true,
  onToggleDesktop,
}) {
  return (
    <>
      {/* Backdrop for mobile drawer */}
      {isOpen && (
        <div
          className="chat-sidebar__backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`chat-sidebar ${isOpen ? 'chat-sidebar--open' : ''} ${
          !isDesktopOpen ? 'chat-sidebar--collapsed' : ''
        }`}
      >
        {/* Sidebar Header with New Chat button */}
        <div className="chat-sidebar__header">
          <button
            type="button"
            className="chat-sidebar__new-btn"
            onClick={() => {
              onNewChat();
              if (onClose) onClose();
            }}
            title="Start a new clinical consultation session"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            <span>New Consultation</span>
          </button>

          {/* Collapse button on desktop */}
          {onToggleDesktop && (
            <button
              type="button"
              className="chat-sidebar__desktop-toggle-btn"
              onClick={onToggleDesktop}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
            </button>
          )}

          {/* Close button for mobile drawer */}
          <button
            type="button"
            className="chat-sidebar__close-btn"
            onClick={onClose}
            aria-label="Close conversation list"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Conversation List */}
        <div className="chat-sidebar__list" role="navigation" aria-label="Past consultations">
          <div className="chat-sidebar__label">Previous Consultations</div>

          {/* Loading Skeleton State */}
          {isLoading && (
            <div className="chat-sidebar__loading" aria-label="Loading past consultations">
              <div className="chat-sidebar__skeleton-item" />
              <div className="chat-sidebar__skeleton-item" />
              <div className="chat-sidebar__skeleton-item" />
            </div>
          )}

          {/* Error State */}
          {!isLoading && error && (
            <div className="chat-sidebar__error" role="alert">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p>{error}</p>
              {onRetry && (
                <button
                  type="button"
                  className="chat-sidebar__retry-btn"
                  onClick={onRetry}
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

          {/* Empty State */}
          {!isLoading && !error && conversations.length === 0 && (
            <div className="chat-sidebar__empty">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <p>No past consultations yet.</p>
              <span>Start your first session above</span>
            </div>
          )}

          {/* Conversation Items */}
          {!isLoading && !error && conversations.length > 0 && (
            <ul className="chat-sidebar__items">
              {conversations.map((conv) => {
                const isActive = conv.id === activeId;
                const titleToDisplay = conv.displayTitle || conv.title || 'New Consultation';
                const dateToDisplay = formatConversationDate(
                  conv.lastMessageAt || conv.updatedAt || conv.createdAt
                );

                return (
                  <li key={conv.id}>
                    <button
                      type="button"
                      className={`chat-sidebar__item ${isActive ? 'chat-sidebar__item--active' : ''}`}
                      onClick={() => {
                        onSelect(conv.id);
                        if (onClose) onClose();
                      }}
                      aria-current={isActive ? 'page' : undefined}
                      title={titleToDisplay}
                    >
                      <div className="item-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                        </svg>
                      </div>
                      <div className="item-body">
                        <span className="item-title">{titleToDisplay}</span>
                        {dateToDisplay && <span className="item-date">{dateToDisplay}</span>}
                      </div>
                      {isActive && <span className="item-active-dot" aria-hidden="true" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}
