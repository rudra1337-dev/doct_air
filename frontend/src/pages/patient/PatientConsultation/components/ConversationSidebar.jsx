import { formatDate } from '../../../../utils/formatDate';

export default function ConversationSidebar({
  conversations = [],
  activeId = null,
  onSelect,
  onNewChat,
  isLoading = false,
  isOpen = false,
  onClose,
}) {
  const formatConvDate = (dateString) => {
    if (!dateString) return '';
    try {
      return formatDate(dateString, { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <>
      {/* Backdrop for mobile view */}
      {isOpen && (
        <div
          className="chat-sidebar__backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`chat-sidebar ${isOpen ? 'chat-sidebar--open' : ''}`}>
        {/* Sidebar Header with New Chat button */}
        <div className="chat-sidebar__header">
          <button
            type="button"
            className="chat-sidebar__new-btn"
            onClick={() => {
              onNewChat();
              if (onClose) onClose();
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            <span>New Consultation</span>
          </button>

          {/* Close button for mobile */}
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

          {isLoading && (
            <div className="chat-sidebar__loading">
              <div className="chat-sidebar__skeleton-item" />
              <div className="chat-sidebar__skeleton-item" />
              <div className="chat-sidebar__skeleton-item" />
            </div>
          )}

          {!isLoading && conversations.length === 0 && (
            <div className="chat-sidebar__empty">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <p>No past consultations yet.</p>
              <span>Start your first session above</span>
            </div>
          )}

          {!isLoading && conversations.length > 0 && (
            <ul className="chat-sidebar__items">
              {conversations.map((conv) => {
                const isActive = conv.id === activeId;
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
                    >
                      <div className="item-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                        </svg>
                      </div>
                      <div className="item-body">
                        <span className="item-title" title={conv.title || 'Consultation'}>
                          {conv.title || 'New Consultation'}
                        </span>
                        <span className="item-date">
                          {formatConvDate(conv.lastMessageAt || conv.createdAt)}
                        </span>
                      </div>
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
