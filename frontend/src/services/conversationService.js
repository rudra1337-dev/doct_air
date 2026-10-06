import axios from 'axios';
import { apiGet, apiPost, apiClient } from './api';

export const conversationService = {
  /**
   * Fetch all conversations for the authenticated user
   * @returns {Promise<{ success: boolean, conversations: Array }>}
   */
  fetchConversations: () => apiGet('/conversations'),

  /**
   * Create a new conversation session
   * @param {string} [title] - Optional conversation title
   * @returns {Promise<{ success: boolean, conversation: Object }>}
   */
  createConversation: (title) => apiPost('/conversations', { title }),

  /**
   * Fetch messages for a specific conversation
   * @param {string} conversationId
   * @returns {Promise<{ success: boolean, messages: Array }>}
   */
  fetchMessages: (conversationId) => apiGet(`/conversations/${conversationId}/messages`),

  /**
   * Stream a user message and receive progressive assistant responses via SSE using Axios
   *
   * @param {string} conversationId
   * @param {string} content
   * @param {Object} callbacks
   * @param {Function} [callbacks.onStart] - Called on message_start ({ conversationId, userMessage })
   * @param {Function} [callbacks.onDelta] - Called on message_delta ({ conversationId, delta })
   * @param {Function} [callbacks.onComplete] - Called on message_complete ({ conversationId, message })
   * @param {Function} [callbacks.onError] - Called on message_error ({ conversationId, error, partial })
   * @param {AbortSignal} [callbacks.signal] - Optional abort signal
   */
  streamMessage: async (conversationId, content, { onStart, onDelta, onComplete, onError, signal } = {}) => {
    try {
      const stream = await apiClient.post(
        `/conversations/${conversationId}/messages/stream`,
        { content },
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
          },
          responseType: 'stream',
          adapter: 'fetch',
          signal,
        }
      );

      if (!stream || typeof stream.getReader !== 'function') {
        throw new Error('ReadableStream not supported on this response');
      }

      const reader = stream.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let boundary = buffer.indexOf('\n\n');
        while (boundary !== -1) {
          const block = buffer.slice(0, boundary).trim();
          buffer = buffer.slice(boundary + 2);

          if (block) {
            const lines = block.split('\n');
            let eventType = 'message';
            let rawData = '';

            for (const line of lines) {
              if (line.startsWith('event:')) {
                eventType = line.replace('event:', '').trim();
              } else if (line.startsWith('data:')) {
                rawData = line.replace('data:', '').trim();
              }
            }

            let parsedData = rawData;
            try {
              parsedData = JSON.parse(rawData);
            } catch {
              // keep as string
            }

            if (eventType === 'message_start' && onStart) {
              onStart(parsedData);
            } else if (eventType === 'message_delta' && onDelta) {
              onDelta(parsedData);
            } else if (eventType === 'message_complete' && onComplete) {
              onComplete(parsedData);
            } else if (eventType === 'message_error' && onError) {
              onError(parsedData);
            }
          }

          boundary = buffer.indexOf('\n\n');
        }
      }
    } catch (err) {
      if (axios.isCancel(err) || err.name === 'AbortError' || err.name === 'CanceledError') {
        return;
      }
      if (onError) {
        onError({ conversationId, error: err.message, partial: false });
      }
      throw err;
    }
  },
};

export default conversationService;
