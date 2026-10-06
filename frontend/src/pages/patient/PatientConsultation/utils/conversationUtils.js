/**
 * Utility functions for conversation formatting, title derivation, and sorting
 */

/**
 * Derives a clean, user-friendly display title for a consultation.
 * Respects backend conversation title if present.
 * Otherwise safely derives a temporary title from the first user message.
 *
 * @param {Object} conv - Conversation object
 * @param {string} [firstUserMessageContent] - Content of the first user message
 * @returns {string}
 */
export function deriveConversationTitle(conv, firstUserMessageContent = null) {
  if (conv?.title && conv.title.trim() && conv.title.trim() !== 'New Consultation') {
    return conv.title.trim();
  }

  if (firstUserMessageContent && typeof firstUserMessageContent === 'string') {
    const cleaned = firstUserMessageContent.replace(/\s+/g, ' ').trim();
    if (cleaned.length > 0) {
      return cleaned.length > 40 ? `${cleaned.slice(0, 40)}...` : cleaned;
    }
  }

  return conv?.title || 'New Consultation';
}

/**
 * Sorts conversations chronologically by most recently updated/active first.
 *
 * @param {Array} list - Array of conversation objects
 * @returns {Array}
 */
export function sortConversationsByRecent(list = []) {
  return [...list].sort((a, b) => {
    const timeA = new Date(a.lastMessageAt || a.updatedAt || a.createdAt).getTime() || 0;
    const timeB = new Date(b.lastMessageAt || b.updatedAt || b.createdAt).getTime() || 0;
    return timeB - timeA;
  });
}
