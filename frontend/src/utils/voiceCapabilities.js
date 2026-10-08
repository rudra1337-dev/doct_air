/**
 * Voice capabilities detection utility for Web Speech API.
 * Detects browser support for:
 * 1. Speech Recognition (SpeechRecognition / webkitSpeechRecognition)
 * 2. Speech Synthesis (window.speechSynthesis)
 *
 * Designed with SSR / initial-render safety (guards against missing window/browser APIs).
 */

/**
 * Safely resolves the SpeechRecognition constructor if available in the browser.
 * Supports standard `SpeechRecognition` and WebKit prefixed `webkitSpeechRecognition`.
 *
 * @returns {typeof window.SpeechRecognition | null}
 */
export function getSpeechRecognitionClass() {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  } catch {
    return null;
  }
}

/**
 * Checks whether the browser supports Speech Recognition (voice input / STT).
 *
 * @returns {boolean}
 */
export function isSpeechRecognitionSupported() {
  return Boolean(getSpeechRecognitionClass());
}

/**
 * Checks whether the browser supports Speech Synthesis (voice output / TTS).
 *
 * @returns {boolean}
 */
export function isSpeechSynthesisSupported() {
  if (typeof window === 'undefined') {
    return false;
  }
  try {
    return 'speechSynthesis' in window && Boolean(window.speechSynthesis);
  } catch {
    return false;
  }
}

/**
 * Returns an object containing the browser's voice capability flags.
 *
 * @returns {{ speechRecognitionSupported: boolean, speechSynthesisSupported: boolean }}
 */
export function getVoiceCapabilities() {
  return {
    speechRecognitionSupported: isSpeechRecognitionSupported(),
    speechSynthesisSupported: isSpeechSynthesisSupported(),
  };
}

export default {
  getSpeechRecognitionClass,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  getVoiceCapabilities,
};
