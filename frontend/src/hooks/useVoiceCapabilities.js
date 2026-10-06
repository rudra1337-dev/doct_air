import { useMemo } from 'react';
import {
  getVoiceCapabilities,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
} from '../utils/voiceCapabilities';

/**
 * Custom hook to detect browser voice capabilities (Speech Recognition and Speech Synthesis).
 * Safe for SSR and initial renders.
 *
 * @returns {{
 *   speechRecognitionSupported: boolean,
 *   speechSynthesisSupported: boolean,
 *   isSpeechRecognitionSupported: boolean,
 *   isSpeechSynthesisSupported: boolean
 * }}
 */
export function useVoiceCapabilities() {
  return useMemo(() => {
    const capabilities = getVoiceCapabilities();
    return {
      speechRecognitionSupported: capabilities.speechRecognitionSupported,
      speechSynthesisSupported: capabilities.speechSynthesisSupported,
      isSpeechRecognitionSupported: capabilities.speechRecognitionSupported,
      isSpeechSynthesisSupported: capabilities.speechSynthesisSupported,
    };
  }, []);
}

export { isSpeechRecognitionSupported, isSpeechSynthesisSupported };
export default useVoiceCapabilities;
