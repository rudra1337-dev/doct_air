/**
 * Format an ISO date string to a human-readable format.
 * @param {string} iso
 * @param {Intl.DateTimeFormatOptions} opts
 */
export const formatDate = (iso, opts = { dateStyle: 'medium' }) =>
  new Intl.DateTimeFormat('en-US', opts).format(new Date(iso));

/**
 * Format a conversation timestamp into a relative or compact date string
 * (e.g. "2:30 PM", "Yesterday", "Oct 6")
 * @param {string|Date} iso
 * @returns {string}
 */
export const formatConversationDate = (iso) => {
  if (!iso) return '';
  try {
    const date = new Date(iso);
    if (isNaN(date.getTime())) return '';
    const now = new Date();

    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    if (isYesterday) {
      return 'Yesterday';
    }

    if (date.getFullYear() === now.getFullYear()) {
      return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
    }

    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
  } catch {
    return '';
  }
};
