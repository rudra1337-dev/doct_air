import { useRef, useEffect } from 'react';
import { combineText } from '../../../../hooks/useSpeechRecognition.js';
import ChatDocumentTray from './ChatDocumentTray.jsx';
import { validatePdfFile } from '../utils/documentUtils.js';

export default function ChatInput({
  value = '',
  onChange,
  onSend,
  disabled = false,
  isStreaming = false,
  speechRecognitionSupported = false,
  voiceState = 'idle',
  onToggleVoice,
  voiceError = null,
  interimTranscript = '',
  documents = [],
  isUploadingDocument = false,
  uploadingFileName = '',
  onAttachDocument,
  onDeleteDocument,
  isDeletingDocumentId = null,
  documentError = null,
  onClearDocumentError,
}) {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const isListening = voiceState === 'listening';
  const isStopping = voiceState === 'stopping';

  // Live text displayed in composer (base text + live interim speech while listening)
  const displayValue =
    isListening && interimTranscript ? combineText(value, interimTranscript) : value;

  // Auto-resize textarea height as content expands
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 140);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [displayValue]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (displayValue.trim() && !disabled && !isStreaming) {
        onSend(displayValue);
      }
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so re-selecting same file triggers change
    e.target.value = '';

    const validation = validatePdfFile(file, 10);
    if (!validation.valid) {
      if (onClearDocumentError) onClearDocumentError(validation.error);
      return;
    }

    if (onAttachDocument) {
      onAttachDocument(file);
    }
  };

  const isSendDisabled = disabled || isStreaming || !displayValue.trim();

  // Dynamic placeholder adapting to conversation and voice state
  let placeholderText = 'Message DoctAir (describe symptoms or medical questions)...';
  if (isListening) {
    placeholderText = displayValue
      ? ''
      : 'Listening... Speak clearly into your microphone';
  } else if (isStopping) {
    placeholderText = 'Stopping voice input...';
  } else if (isStreaming) {
    placeholderText = 'Assistant is responding...';
  }

  return (
    <div className="chat-input-wrapper">
      {/* Document Error Notice */}
      {documentError && (
        <div className="chat-input-doc-error" role="alert">
          <span>{documentError}</span>
          {onClearDocumentError && (
            <button
              type="button"
              className="chat-doc-error-dismiss"
              onClick={onClearDocumentError}
              aria-label="Dismiss document error"
            >
              ×
            </button>
          )}
        </div>
      )}

      {/* Voice Error Notice */}
      {voiceError && (
        <div className="chat-input-voice-error" role="alert">
          <span>{voiceError}</span>
        </div>
      )}

      {/* Attached Documents Tray */}
      <ChatDocumentTray
        documents={documents}
        isUploading={isUploadingDocument}
        uploadingFileName={uploadingFileName}
        onDeleteDocument={onDeleteDocument}
        isDeletingId={isDeletingDocumentId}
      />

      <form
        className={`chat-input-container ${isListening ? 'chat-input-container--listening' : ''}`}
        onSubmit={(e) => {
          e.preventDefault();
          if (!isSendDisabled) {
            onSend(displayValue);
          }
        }}
      >
        {/* Hidden File Input for PDF Upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          style={{ display: 'none' }}
          onChange={handleFileChange}
          disabled={disabled || isStreaming || isUploadingDocument}
        />

        <textarea
          ref={textareaRef}
          className="chat-textarea"
          value={displayValue}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholderText}
          rows={1}
          disabled={disabled || isStreaming}
          aria-label="Message input"
        />

        {/* PDF Attachment Button */}
        {onAttachDocument && (
          <button
            type="button"
            className={`chat-attach-btn ${isUploadingDocument ? 'chat-attach-btn--uploading' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isStreaming || isUploadingDocument}
            aria-label="Attach PDF medical report"
            title="Attach PDF medical report (max 10MB)"
          >
            {isUploadingDocument ? (
              <div className="chat-attach-spinner" aria-hidden="true" />
            ) : (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            )}
          </button>
        )}

        {/* Push-to-Talk Microphone Button (only if Speech Recognition is supported) */}
        {speechRecognitionSupported && onToggleVoice && (
          <button
            type="button"
            className={`chat-mic-btn ${isListening ? 'chat-mic-btn--listening' : ''} ${
              isStopping ? 'chat-mic-btn--stopping' : ''
            }`}
            onClick={onToggleVoice}
            disabled={disabled || isStreaming || isStopping}
            aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
            title={
              isListening
                ? 'Listening... Click to stop voice input'
                : isStopping
                ? 'Stopping voice input...'
                : 'Start voice input'
            }
            aria-pressed={isListening}
          >
            {isStopping ? (
              <div className="chat-mic-spinner" aria-hidden="true" />
            ) : isListening ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <rect x="5" y="5" width="14" height="14" rx="2" />
              </svg>
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
            )}
          </button>
        )}

        {/* Message Send Button */}
        <button
          type="submit"
          className="chat-send-btn"
          disabled={isSendDisabled}
          aria-label={isStreaming ? 'Generating response' : 'Send message'}
          title={isStreaming ? 'Assistant responding' : 'Send message (Enter)'}
        >
          {isStreaming ? (
            <div className="chat-send-spinner" aria-hidden="true" />
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="19" x2="12" y2="5" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="5 12 12 5 19 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </form>

      <div className="chat-disclaimer">
        <span>
          DoctAir AI provides intake assistance and health information. Not a substitute for professional diagnosis.
        </span>
      </div>
    </div>
  );
}
