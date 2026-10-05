import { GoogleGenAI } from '@google/genai';
import { getGeminiConfig, validateGeminiConfig } from './gemini.config.js';
import { wrapGeminiError } from './gemini.errors.js';

let cachedClient = null;
let cachedKey = null;

/**
 * Initializes and returns a GoogleGenAI client instance
 *
 * @param {string} [customApiKey] - Optional API key override
 * @returns {GoogleGenAI} The initialized GoogleGenAI client instance
 */
export const getGeminiClient = (customApiKey = '') => {
  const config = getGeminiConfig({ apiKey: customApiKey });
  validateGeminiConfig(config.apiKey);

  // Return cached client if the key matches
  if (cachedClient && cachedKey === config.apiKey) {
    return cachedClient;
  }

  try {
    const client = new GoogleGenAI({ apiKey: config.apiKey });
    cachedClient = client;
    cachedKey = config.apiKey;
    return client;
  } catch (error) {
    throw wrapGeminiError(error, config.apiKey);
  }
};

/**
 * Resets cached client instance (primarily used for unit testing or key rotation)
 */
export const resetGeminiClient = () => {
  cachedClient = null;
  cachedKey = null;
};
