import { getGeminiClient } from './gemini.client.js';
import { getGeminiConfig, isGeminiConfigured } from './gemini.config.js';
import { wrapGeminiError, GeminiError } from './gemini.errors.js';
import { DEFAULT_HEALTHCARE_SYSTEM_INSTRUCTION } from './gemini.prompts.js';

/**
 * Formats a generic array of conversation messages into Gemini API content format.
 *
 * Incoming messages: [{ role: 'user' | 'assistant', content: string }]
 * Outgoing contents: [{ role: 'user' | 'model', parts: [{ text: string }] }]
 *
 * Enforces role normalization and turn-alternation required by Gemini.
 *
 * @param {Array<{role: string, content: string}>} messages
 * @returns {Array<{role: 'user' | 'model', parts: Array<{text: string}>}>}
 */
export const formatMessagesForGemini = (messages = []) => {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new GeminiError('Conversation context must be a non-empty array of messages.', {
      statusCode: 400,
      code: 'INVALID_CONTEXT_ERROR',
    });
  }

  const normalized = [];

  for (const msg of messages) {
    if (!msg || typeof msg !== 'object') continue;

    const rawRole = (msg.role || '').toLowerCase();
    const rawContent = typeof msg.content === 'string' ? msg.content.trim() : '';

    if (!rawContent) continue;

    // Map roles: 'assistant' -> 'model', 'user' -> 'user'
    let geminiRole = 'user';
    if (rawRole === 'assistant' || rawRole === 'model') {
      geminiRole = 'model';
    }

    // Merge consecutive turns of the same role to maintain strict alternation
    const prevTurn = normalized[normalized.length - 1];
    if (prevTurn && prevTurn.role === geminiRole) {
      prevTurn.parts.push({ text: rawContent });
    } else {
      normalized.push({
        role: geminiRole,
        parts: [{ text: rawContent }],
      });
    }
  }

  if (normalized.length === 0) {
    throw new GeminiError('No valid message content provided in conversation context.', {
      statusCode: 400,
      code: 'INVALID_CONTEXT_ERROR',
    });
  }

  // Ensure first turn starts with 'user'
  while (normalized.length > 0 && normalized[0].role !== 'user') {
    normalized.shift();
  }

  if (normalized.length === 0) {
    throw new GeminiError('Conversation context must contain at least one user message.', {
      statusCode: 400,
      code: 'INVALID_CONTEXT_ERROR',
    });
  }

  return normalized;
};

/**
 * Public service interface to send conversation context to Gemini and receive generated response
 *
 * @param {Object} options
 * @param {Array<{role: string, content: string}>} options.messages - Standardized conversation context
 * @param {string} [options.systemInstruction] - Optional override for system instruction
 * @param {Object} [options.config] - Optional overrides for model, temperature, maxOutputTokens
 * @param {Object} [options.client] - Optional injected client (for testing or custom instances)
 * @param {string} [options.apiKey] - Optional custom API key
 * @returns {Promise<{text: string, finishReason: string, usage: Object|null, model: string}>}
 */
export const generateResponse = async ({
  messages,
  systemInstruction,
  config: configOverrides = {},
  client = null,
  apiKey = '',
} = {}) => {
  const activeConfig = getGeminiConfig(configOverrides);
  const effectiveApiKey = apiKey || activeConfig.apiKey;

  // 1. Format and validate conversation context
  const contents = formatMessagesForGemini(messages);

  // 2. Resolve client instance
  const aiClient = client || getGeminiClient(effectiveApiKey);

  // 3. Prepare generation payload
  const effectiveInstruction =
    systemInstruction ||
    activeConfig.systemInstruction ||
    DEFAULT_HEALTHCARE_SYSTEM_INSTRUCTION;

  try {
    const response = await aiClient.models.generateContent({
      model: activeConfig.model,
      contents,
      config: {
        systemInstruction: effectiveInstruction,
        temperature: activeConfig.temperature,
        maxOutputTokens: activeConfig.maxOutputTokens,
      },
    });

    const generatedText = response.text || '';
    const candidate = response.candidates?.[0];
    const finishReason = candidate?.finishReason || 'STOP';

    const usage = response.usageMetadata
      ? {
          promptTokens: response.usageMetadata.promptTokenCount || 0,
          candidatesTokens: response.usageMetadata.candidatesTokenCount || 0,
          totalTokens: response.usageMetadata.totalTokenCount || 0,
        }
      : null;

    return {
      text: generatedText,
      finishReason,
      usage,
      model: activeConfig.model,
    };
  } catch (error) {
    throw wrapGeminiError(error, effectiveApiKey);
  }
};

/**
 * Checks if Gemini service is configured and available
 */
export const isAvailable = (apiKey = '') => {
  return isGeminiConfigured(apiKey);
};

/**
 * Exposes active sanitized configuration (without leaking API key)
 */
export const getActiveConfig = (overrides = {}) => {
  const cfg = getGeminiConfig(overrides);
  return {
    isConfigured: isGeminiConfigured(cfg.apiKey),
    model: cfg.model,
    temperature: cfg.temperature,
    maxOutputTokens: cfg.maxOutputTokens,
    hasSystemInstruction: Boolean(cfg.systemInstruction),
  };
};
