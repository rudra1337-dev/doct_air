import { useState, useCallback, useRef, useEffect } from 'react';
import { getSpeechRecognitionClass } from '../utils/voiceCapabilities.js';
import { VOICE_STATE } from './useVoiceState.js';

/**
 * Combines existing base text with newly recognized transcript,
 * ensuring clean spacing and avoiding duplicate whitespace.
 *
 * @param {string} base - Existing text in composer
 * @param {string} addition - Newly recognized speech transcript
 * @returns {string} Combined text
 */
export function combineText(base = '', addition = '') {
  const trimmedAddition = (addition || '').trim();
  if (!base) return trimmedAddition;
  if (!trimmedAddition) return base;

  if (base.endsWith('\n')) {
    return `${base}${trimmedAddition}`;
  }

  const cleanBase = base.trimEnd();
  return cleanBase ? `${cleanBase} ${trimmedAddition}` : trimmedAddition;
}

/**
 * Maps browser-native SpeechRecognition error codes to patient-friendly messages.
 * Never exposes raw technical codes (e.g. NotAllowedError) to the user.
 *
 * @param {string} error - Web Speech API error string
 * @returns {string|null} User-friendly message or null if intentional abort
 */
export function mapSpeechError(error) {
  switch (error) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone permission was denied. You can continue using text input.';
    case 'no-speech':
      return 'No speech was detected. Please try again.';
    case 'network':
      return 'Network connection issue during voice recognition. Please try again.';
    case 'audio-capture':
      return 'No microphone was detected. Please check your audio devices.';
    case 'language-not-supported':
      return 'Selected language is not supported for voice recognition.';
    case 'aborted':
      // Aborted intentionally by user or unmount; no user error banner needed
      return null;
    default:
      return 'Unable to process voice input. Please try again or type your message.';
  }
}

/**
 * Custom hook for browser-native Speech-to-Text integration.
 * Manages Web Speech API SpeechRecognition lifecycle, interim/final transcript
 * accumulation, error recovery, and safe unmount cleanup.
 *
 * @param {Object} [options]
 * @param {string} [options.currentText] - Current composer text to preserve and append to
 * @param {Function} [options.onTranscript] - Callback receiving updated final text: (text: string) => void
 * @param {Function} [options.onError] - Optional error callback: (errorMessage: string) => void
 * @returns {Object} Voice state, transcripts, and control handlers
 */
export function useSpeechRecognition({
  currentText = '',
  onTranscript,
  onError,
} = {}) {
  const [voiceState, setVoiceState] = useState(VOICE_STATE.IDLE);
  const [voiceError, setVoiceError] = useState(null);
  const [interimTranscript, setInterimTranscript] = useState('');

  const recognitionRef = useRef(null);
  const isMountedRef = useRef(true);
  const baseTextRef = useRef('');
  const currentTextRef = useRef(currentText);
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);
  const errorTimeoutRef = useRef(null);
  const stoppingTimeoutRef = useRef(null);

  // Keep refs synchronized with latest props without recreating event listeners
  useEffect(() => {
    currentTextRef.current = currentText;
  }, [currentText]);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // Teardown recognition on unmount to prevent memory leaks or dangling listeners
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      if (stoppingTimeoutRef.current) clearTimeout(stoppingTimeoutRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore cleanup errors on unmount
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (voiceState === VOICE_STATE.LISTENING || voiceState === VOICE_STATE.STOPPING) {
      return;
    }

    const SpeechRecognitionClass = getSpeechRecognitionClass();
    if (!SpeechRecognitionClass) {
      const errMessage = 'Voice recognition is not supported in this browser.';
      setVoiceState(VOICE_STATE.ERROR);
      setVoiceError(errMessage);
      if (onErrorRef.current) onErrorRef.current(errMessage);
      return;
    }

    // Clean up any existing recognition instance before starting anew
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    setVoiceError(null);
    setInterimTranscript('');
    // Snapshot existing text in composer as the baseline to append to
    baseTextRef.current = currentTextRef.current || '';

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang =
        (typeof navigator !== 'undefined' && navigator.language) || 'en-US';

      recognition.onstart = () => {
        if (!isMountedRef.current) return;
        setVoiceState(VOICE_STATE.LISTENING);
      };

      recognition.onresult = (event) => {
        if (!isMountedRef.current) return;

        let interim = '';
        let finalBatch = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          const text = res[0]?.transcript || '';
          if (res.isFinal) {
            finalBatch += text;
          } else {
            interim += text;
          }
        }

        // When a final transcript chunk is delivered:
        if (finalBatch) {
          const combined = combineText(baseTextRef.current, finalBatch);
          baseTextRef.current = combined;
          if (onTranscriptRef.current) {
            onTranscriptRef.current(combined);
          }
        }

        setInterimTranscript(interim);
      };

      recognition.onerror = (event) => {
        if (!isMountedRef.current) return;
        const mapped = mapSpeechError(event.error);

        if (mapped) {
          setVoiceState(VOICE_STATE.ERROR);
          setVoiceError(mapped);
          if (onErrorRef.current) onErrorRef.current(mapped);

          if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
          // Auto-recover back to IDLE after 4 seconds
          errorTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              setVoiceState(VOICE_STATE.IDLE);
              setVoiceError(null);
            }
          }, 4000);
        } else {
          // Intentional abort or non-critical event
          setVoiceState(VOICE_STATE.IDLE);
          setVoiceError(null);
        }
      };

      recognition.onend = () => {
        if (!isMountedRef.current) return;
        setInterimTranscript('');
        recognitionRef.current = null;

        setVoiceState((prev) => {
          if (prev === VOICE_STATE.ERROR) return prev;
          return VOICE_STATE.IDLE;
        });
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      if (!isMountedRef.current) return;
      const mapped = mapSpeechError(err.name || 'default');
      setVoiceState(VOICE_STATE.ERROR);
      setVoiceError(mapped);
      recognitionRef.current = null;
    }
  }, [voiceState]);

  const stopListening = useCallback(() => {
    if (voiceState !== VOICE_STATE.LISTENING) {
      return;
    }

    setVoiceState(VOICE_STATE.STOPPING);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    }

    // Safety fallback: if onend does not fire promptly, return to IDLE
    if (stoppingTimeoutRef.current) clearTimeout(stoppingTimeoutRef.current);
    stoppingTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setInterimTranscript('');
        setVoiceState((prev) => (prev === VOICE_STATE.STOPPING ? VOICE_STATE.IDLE : prev));
      }
    }, 800);
  }, [voiceState]);

  const toggleVoice = useCallback(() => {
    if (voiceState === VOICE_STATE.LISTENING) {
      stopListening();
    } else if (voiceState === VOICE_STATE.IDLE) {
      startListening();
    }
  }, [voiceState, startListening, stopListening]);

  const resetVoiceState = useCallback(() => {
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    if (stoppingTimeoutRef.current) clearTimeout(stoppingTimeoutRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setVoiceState(VOICE_STATE.IDLE);
    setVoiceError(null);
    setInterimTranscript('');
  }, []);

  return {
    voiceState,
    voiceError,
    interimTranscript,
    isIdle: voiceState === VOICE_STATE.IDLE,
    isListening: voiceState === VOICE_STATE.LISTENING,
    isStopping: voiceState === VOICE_STATE.STOPPING,
    hasError: voiceState === VOICE_STATE.ERROR,
    startListening,
    stopListening,
    toggleVoice,
    resetVoiceState,
  };
}

export default useSpeechRecognition;
