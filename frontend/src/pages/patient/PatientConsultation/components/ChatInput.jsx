import { useRef, useEffect } from 'react';
import { combineText } from '../../../../hooks/useSpeechRecognition.js';
import ChatDocumentTray from './ChatDocumentTray.jsx';

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
  draftAttachments = [],
  onAttachFiles,
  onRemoveDraft,
  onRetryDraft,
  documents = [],
  uploadingFiles = [],
  isUploadingDocument = false,
  uploadingFileName = '',
  onAttachDocument,
  onAttachDocuments,
  onCancelUpload,
  onDeleteDocument,
  isDeletingDocumentId = null,
  onRetryDocument,
  isRetryingDocumentId = null,
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

  // Attachment lifecycle checks for send gating
  const hasUploading =
    draftAttachments.some((d) => d.status === 'uploading') ||
    (uploadingFiles && uploadingFiles.length > 0) ||
    Boolean(isUploadingDocument);

  const hasFailed =
    draftAttachments.some((d) => d.status === 'failed') ||
    documents.some((d) => (d.status || d.uploadStatus) === 'failed');

  const readyDrafts = draftAttachments.filter(
    (d) => d.status === 'ready' && Boolean(d.attachmentId)
  );
  const hasReadyDrafts = readyDrafts.length > 0;
  const hasText = Boolean(displayValue && displayValue.trim().length > 0);

  // Send gating: enabled if text exists OR ready attachment exists, AND nothing is uploading or failed
  const canSend =
    !disabled &&
    !isStreaming &&
    !hasUploading &&
    !hasFailed &&
    (hasText || hasReadyDrafts);

  const isSendDisabled = !canSend;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSend) {
        onSend(displayValue);
      }
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Reset input so re-selecting same files triggers change
    e.target.value = '';

    if (onAttachFiles) {
      onAttachFiles(files);
    } else if (onAttachDocuments) {
      onAttachDocuments(files);
    } else if (onAttachDocument) {
      files.forEach((f) => onAttachDocument(f));
    }
  };

  // Dynamic send button title / tooltip reflecting exact state
  let sendButtonTitle = 'Send message (Enter)';
  if (isStreaming) {
    sendButtonTitle = 'Assistant responding';
  } else if (hasUploading) {
    sendButtonTitle = 'Please wait for attachment to finish uploading...';
  } else if (hasFailed) {
    sendButtonTitle = 'Remove or retry failed report before sending';
  } else if (!hasText && !hasReadyDrafts) {
    sendButtonTitle = 'Type a message or attach a report to send';
  }

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
  } else if (hasReadyDrafts && !hasText) {
    placeholderText = 'Ask questions about your attached report, or press Send...';
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

      <div
        className={`chat-input-container ${isListening ? 'chat-input-container--listening' : ''}`}
        onClick={() => {
          if (!isListening) {
            textareaRef.current?.focus();
          }
        }}
      >
        {/* Hidden File Input for PDF Upload (supports multiple) */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
          disabled={disabled || isStreaming || hasUploading}
        />

        {/* Attached Documents / Draft Attachments Tray INSIDE Composer Container */}
        <ChatDocumentTray
          draftAttachments={draftAttachments}
          onRemoveDraft={onRemoveDraft}
          onRetryDraft={onRetryDraft}
          documents={documents}
          uploadingFiles={uploadingFiles}
          isUploading={isUploadingDocument}
          uploadingFileName={uploadingFileName}
          onCancelUpload={onCancelUpload}
          onDeleteDocument={onDeleteDocument}
          isDeletingId={isDeletingDocumentId}
          onRetryDocument={onRetryDocument}
          isRetryingId={isRetryingDocumentId}
        />

        {/* Input Controls Row: Paperclip + Textarea + Mic + Send */}
        <div className="chat-input-controls-row">
          {/* PDF Attachment Button (Paperclip) */}
          {(onAttachFiles || onAttachDocuments || onAttachDocument) && (
            <button
              type="button"
              className={`chat-attach-btn ${hasUploading ? 'chat-attach-btn--uploading' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              disabled={disabled || isStreaming || hasUploading}
              aria-label="Attach PDF medical report"
              title={hasUploading ? 'Uploading report...' : 'Attach PDF medical report (max 10MB)'}
            >
              {hasUploading ? (
                <div className="chat-attach-spinner" aria-hidden="true" />
              ) : (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
              )}
            </button>
          )}

          <textarea
            ref={textareaRef}
            className="chat-textarea"
            value={displayValue}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholderText}
            disabled={disabled || isStreaming || isListening}
            rows={1}
            aria-label="Medical consultation message input"
          />

          <div className="chat-input-actions">
            {/* Microphone / Push-to-Talk Voice Button */}
            {speechRecognitionSupported && (
              <button
                type="button"
                className={`chat-mic-btn ${
                  isListening
                    ? 'chat-mic-btn--listening'
                    : isStopping
                    ? 'chat-mic-btn--stopping'
                    : ''
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleVoice();
                }}
                disabled={disabled || isStreaming}
                aria-label={
                  isListening
                    ? 'Stop listening'
                    : isStopping
                    ? 'Stopping voice recognition'
                    : 'Start push-to-talk voice input'
                }
                title={
                  isListening
                    ? 'Listening... Click to send or finish'
                    : isStopping
                    ? 'Stopping...'
                    : 'Click to speak your message'
                }
              >
                {isListening ? (
                  <div className="chat-mic-pulse" aria-hidden="true" />
                ) : isStopping ? (
                  <div className="chat-mic-spinner" aria-hidden="true" />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                )}
              </button>
            )}

            {/* Send Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (canSend) onSend(displayValue);
              }}
              className="chat-send-btn"
              disabled={isSendDisabled}
              aria-label={isStreaming ? 'Generating response' : 'Send message'}
              title={sendButtonTitle}
            >
              {isStreaming ? (
                <div className="chat-send-spinner" aria-hidden="true" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
