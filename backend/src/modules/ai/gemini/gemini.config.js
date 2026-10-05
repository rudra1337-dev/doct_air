import {
  GEMINI_API_KEY,
  GEMINI_MODEL,
  GEMINI_TEMPERATURE,
  GEMINI_MAX_OUTPUT_TOKENS,
} from '../../../config/env.js';
import { GeminiConfigError } from './gemini.errors.js';
import { DEFAULT_HEALTHCARE_SYSTEM_INSTRUCTION } from './gemini.prompts.js';

/**
 * Returns current Gemini configuration merged with environment defaults
 */
export const getGeminiConfig = (overrides = {}) => {
  return {
    apiKey: overrides.apiKey || GEMINI_API_KEY || process.env.GEMINI_API_KEY || '',
    model: overrides.model || GEMINI_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    temperature: overrides.temperature !== undefined
      ? overrides.temperature
      : GEMINI_TEMPERATURE,
    maxOutputTokens: overrides.maxOutputTokens !== undefined
      ? overrides.maxOutputTokens
      : GEMINI_MAX_OUTPUT_TOKENS,
    systemInstruction: overrides.systemInstruction || DEFAULT_HEALTHCARE_SYSTEM_INSTRUCTION,
  };
};

/**
 * Checks if a Gemini API key is configured
 */
export const isGeminiConfigured = (customApiKey = '') => {
  const key = customApiKey || GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
  return typeof key === 'string' && key.trim().length > 0;
};

/**
 * Validates that Gemini is configured, throwing a clean GeminiConfigError if not
 */
export const validateGeminiConfig = (customApiKey = '') => {
  if (!isGeminiConfigured(customApiKey)) {
    throw new GeminiConfigError(
      'Gemini API key is not configured. Please set GEMINI_API_KEY in backend environment.'
    );
  }
};
