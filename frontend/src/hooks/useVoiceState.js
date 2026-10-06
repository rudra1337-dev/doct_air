import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Conceptual states for voice push-to-talk interaction.
 */
export const VOICE_STATE = {
  IDLE: 'idle',
  LISTENING: 'listening',
  STOPPING: 'stopping',
  ERROR: 'error',
};

/**
 * Custom hook for managing push-to-talk voice interaction states:
 * idle -> listening -> stopping -> idle (or error -> idle).
 *
 * @param {Object} [options]
 * @param {Function} [options.onStartListening] - Optional callback when listening starts
 * @param {Function} [options.onStopListening] - Optional callback when listening stops
 * @returns {Object} Voice state flags and transition handlers
 */
export function useVoiceState(options = {}) {
  const [voiceState, setVoiceState] = useState(VOICE_STATE.IDLE);
  const [voiceError, setVoiceError] = useState(null);
  const errorTimeoutRef = useRef(null);
  const stoppingTimeoutRef = useRef(null);

  // Clear any timers on unmount
  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      if (stoppingTimeoutRef.current) clearTimeout(stoppingTimeoutRef.current);
    };
  }, []);

  const startListening = useCallback(() => {
    if (voiceState === VOICE_STATE.LISTENING || voiceState === VOICE_STATE.STOPPING) {
      return;
    }
    setVoiceError(null);
    setVoiceState(VOICE_STATE.LISTENING);
    if (options.onStartListening) {
      options.onStartListening();
    }
  }, [voiceState, options]);

  const stopListening = useCallback(() => {
    if (voiceState !== VOICE_STATE.LISTENING) {
      return;
    }
    setVoiceState(VOICE_STATE.STOPPING);
    if (options.onStopListening) {
      options.onStopListening();
    }

    if (stoppingTimeoutRef.current) clearTimeout(stoppingTimeoutRef.current);
    // Transition cleanly back to IDLE after stopping state
    stoppingTimeoutRef.current = setTimeout(() => {
      setVoiceState(VOICE_STATE.IDLE);
    }, 300);
  }, [voiceState, options]);

  const toggleVoice = useCallback(() => {
    if (voiceState === VOICE_STATE.LISTENING) {
      stopListening();
    } else if (voiceState === VOICE_STATE.IDLE) {
      startListening();
    }
  }, [voiceState, startListening, stopListening]);

  const triggerVoiceError = useCallback((message = 'Unable to use microphone') => {
    setVoiceState(VOICE_STATE.ERROR);
    setVoiceError(message);

    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    // Auto-recover back to IDLE after 4 seconds
    errorTimeoutRef.current = setTimeout(() => {
      setVoiceState(VOICE_STATE.IDLE);
      setVoiceError(null);
    }, 4000);
  }, []);

  const resetVoiceState = useCallback(() => {
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    if (stoppingTimeoutRef.current) clearTimeout(stoppingTimeoutRef.current);
    setVoiceState(VOICE_STATE.IDLE);
    setVoiceError(null);
  }, []);

  return {
    voiceState,
    voiceError,
    isIdle: voiceState === VOICE_STATE.IDLE,
    isListening: voiceState === VOICE_STATE.LISTENING,
    isStopping: voiceState === VOICE_STATE.STOPPING,
    hasError: voiceState === VOICE_STATE.ERROR,
    startListening,
    stopListening,
    toggleVoice,
    triggerVoiceError,
    resetVoiceState,
  };
}

export default useVoiceState;
