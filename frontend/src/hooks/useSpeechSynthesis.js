import { useState, useRef, useEffect, useCallback } from 'react';
import { isSpeechSynthesisSupported } from '../utils/voiceCapabilities';

/**
 * Strips markdown and special formatting from text for natural browser speech synthesis.
 * Removes markdown headings, asterisks, bullet points, links, inline code, code blocks,
 * and normalizes whitespace so the screen reader/synthesizer speaks clear text.
 *
 * @param {string} text - Raw markdown or plain text
 * @returns {string} - Clean spoken text
 */
export function stripMarkdownForSpeech(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    // Remove fenced code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Remove inline code backticks while preserving code content
    .replace(/`([^`]+)`/g, '$1')
    // Remove image syntax: ![alt](url) -> alt
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    // Remove link syntax: [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    // Remove headings: # Title, ## Subtitle
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold and italic markers: **text**, *text*, __text__, _text_
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    // Remove strikethrough: ~~text~~
    .replace(/~~(.*?)~~/g, '$1')
    // Remove blockquotes: > quote
    .replace(/^>\s+/gm, '')
    // Remove unordered list markers: -, *, +
    .replace(/^[\s]*[-*+]\s+/gm, '')
    // Remove ordered list numbering: 1., 2.
    .replace(/^[\s]*\d+\.\s+/gm, '')
    // Remove horizontal rules: ---, ***, ___
    .replace(/^(-{3,}|\*{3,}|_{3,})$/gm, '')
    // Replace table pipes with spaces
    .replace(/\|/g, ' ')
    // Collapse multiple empty newlines into a single newline for natural pacing
    .replace(/\n{2,}/g, '\n')
    .trim();
}

/**
 * Custom React hook for Browser-Native Text-to-Speech (TTS).
 * Manages utterance playback, single-active-message speaking state,
 * markdown sanitization, browser lifecycle cleanup, and safety guards.
 *
 * @returns {{
 *   isSpeaking: boolean,
 *   activeMessageId: string | null,
 *   speechSynthesisSupported: boolean,
 *   speak: (messageId: string, text: string) => void,
 *   stop: () => void,
 *   toggleSpeak: (messageId: string, text: string) => void,
 * }}
 */
export function useSpeechSynthesis() {
  const isSupported = isSpeechSynthesisSupported();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeMessageId, setActiveMessageId] = useState(null);

  // Utterance ref to prevent Chromium garbage-collection bug during playback
  const activeUtteranceRef = useRef(null);
  const mountedRef = useRef(true);

  // Immediately cancel any active browser speech synthesis
  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (err) {
        console.warn('Failed to cancel speech synthesis:', err);
      }
    }
    activeUtteranceRef.current = null;
    if (mountedRef.current) {
      setIsSpeaking(false);
      setActiveMessageId(null);
    }
  }, []);

  // Speak a message by messageId and raw text content
  const speak = useCallback(
    (messageId, rawText) => {
      if (!isSupported || typeof window === 'undefined') {
        return;
      }

      // Stop any existing speech before starting a new one (prevents overlapping speech)
      stop();

      const cleanedText = stripMarkdownForSpeech(rawText);
      if (!cleanedText) {
        return;
      }

      try {
        const utterance = new SpeechSynthesisUtterance(cleanedText);

        // Language configuration: use browser/system language if available
        if (typeof navigator !== 'undefined' && navigator.language) {
          utterance.lang = navigator.language;
        } else {
          utterance.lang = 'en-US';
        }

        utterance.rate = 1.4;
        utterance.pitch = 1.8;

        utterance.onstart = () => {
          if (mountedRef.current) {
            setIsSpeaking(true);
            setActiveMessageId(messageId);
          }
        };

        utterance.onend = () => {
          if (mountedRef.current) {
            setIsSpeaking(false);
            setActiveMessageId(null);
          }
          activeUtteranceRef.current = null;
        };

        utterance.onerror = (event) => {
          // 'canceled' and 'interrupted' are expected when speech is stopped or switched
          if (event.error !== 'canceled' && event.error !== 'interrupted') {
            console.warn('SpeechSynthesis error:', event.error);
          }
          if (mountedRef.current) {
            setIsSpeaking(false);
            setActiveMessageId(null);
          }
          activeUtteranceRef.current = null;
        };

        // Retain reference in ref to guard against garbage collection mid-playback
        activeUtteranceRef.current = utterance;

        // If speechSynthesis was paused in browser, resume it
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('Failed to start speech synthesis:', err);
        if (mountedRef.current) {
          setIsSpeaking(false);
          setActiveMessageId(null);
        }
        activeUtteranceRef.current = null;
      }
    },
    [isSupported, stop]
  );

  // Toggle playback: if active message is currently speaking, stop; otherwise start speaking it
  const toggleSpeak = useCallback(
    (messageId, text) => {
      if (activeMessageId === messageId && isSpeaking) {
        stop();
      } else {
        speak(messageId, text);
      }
    },
    [activeMessageId, isSpeaking, speak, stop]
  );

  // Component unmount cleanup: stop speech immediately and reset flags
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // Safely ignore cleanup error
        }
      }
    };
  }, []);

  return {
    isSpeaking,
    activeMessageId,
    speechSynthesisSupported: isSupported,
    speak,
    stop,
    toggleSpeak,
  };
}

export default useSpeechSynthesis;
