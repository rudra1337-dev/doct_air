import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import conversationService from '../../../services/conversationService';
import documentService from '../../../services/documentService';
import ConversationSidebar from './components/ConversationSidebar';
import ChatMessageList from './components/ChatMessageList';
import ChatInput from './components/ChatInput';
import ChatWelcome from './components/ChatWelcome';
import {
  deriveConversationTitle,
  sortConversationsByRecent,
} from './utils/conversationUtils';
import useVoiceCapabilities from '../../../hooks/useVoiceCapabilities';
import useSpeechRecognition from '../../../hooks/useSpeechRecognition';
import useSpeechSynthesis from '../../../hooks/useSpeechSynthesis';
import useDraftAttachments from './hooks/useDraftAttachments';
import './PatientConsultation.css';

export default function PatientConsultation() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const userId = user?.id || user?._id;

  // Session storage key isolated by authenticated user
  const activeSessionKey = userId ? `doctair_active_conv_${userId}` : null;

  // Conversation history state
  const [conversations, setConversations] = useState([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [conversationsError, setConversationsError] = useState(null);

  // Active chat session state
  const [messages, setMessages] = useState([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [messagesError, setMessagesError] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [input, setInput] = useState('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [lastFailedPrompt, setLastFailedPrompt] = useState('');

  // Attached Medical Reports state (persisted)
  const [documents, setDocuments] = useState([]);
  const [documentError, setDocumentError] = useState(null);

  // ChatGPT-style Draft Attachments hook
  const {
    drafts,
    addDrafts,
    removeDraft,
    retryDraft,
    clearDrafts,
    hasUploading: hasUploadingDrafts,
    hasFailed: hasFailedDrafts,
    readyAttachmentIds,
  } = useDraftAttachments({
    conversationId,
    onError: (err) => setDocumentError(err),
  });

  // Voice capabilities & Push-to-Talk Speech Recognition & Text-to-Speech
  const { speechRecognitionSupported, speechSynthesisSupported } = useVoiceCapabilities();
  const {
    voiceState,
    voiceError,
    interimTranscript,
    toggleVoice,
    resetVoiceState,
  } = useSpeechRecognition({
    currentText: input,
    onTranscript: setInput,
  });

  const {
    activeMessageId,
    toggleSpeak,
    stop: stopSpeech,
  } = useSpeechSynthesis();

  // Coordinate STT and TTS mutual exclusion:
  // Starting microphone cancels any active speech output
  const handleToggleVoice = useCallback(() => {
    stopSpeech();
    toggleVoice();
  }, [stopSpeech, toggleVoice]);

  // Starting speech output cancels any active voice recognition
  const handleToggleSpeak = useCallback(
    (messageId, content) => {
      resetVoiceState();
      toggleSpeak(messageId, content);
    },
    [resetVoiceState, toggleSpeak]
  );

  // Refs for race-condition prevention, deletion tracking, and stream abortion
  const isSubmittingRef = useRef(false);
  const streamAbortControllerRef = useRef(null);
  const isNewConversationInitiatedRef = useRef(null);
  const deletingIdsRef = useRef(new Set());
  const activeConversationIdRef = useRef(conversationId);
  useEffect(() => {
    activeConversationIdRef.current = conversationId;
  }, [conversationId]);

  // Active conversation object from list
  const activeConv = conversations.find((c) => c.id === conversationId);

  // 1. Fetch conversations belonging to authenticated user
  const loadConversations = useCallback(async () => {
    try {
      setIsLoadingConversations(true);
      setConversationsError(null);
      const res = await conversationService.fetchConversations();
      if (res?.success && Array.isArray(res.conversations)) {
        const sorted = sortConversationsByRecent(res.conversations);
        setConversations(sorted);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err.message);
      setConversationsError(err.message || 'Unable to load past consultations.');
    } finally {
      setIsLoadingConversations(false);
    }
  }, []);

  // Load conversations on mount or when authenticated user changes
  useEffect(() => {
    loadConversations();
  }, [loadConversations, userId]);

  // 2. Preserve current conversation while navigating:
  // If user arrives at /patient/consultation (without ID) and did NOT explicitly click "New Consultation",
  // restore their last active conversation from session storage if it exists in their history.
  useEffect(() => {
    if (conversationId || isLoadingConversations || !activeSessionKey) return;

    // Check if navigation was an intentional "New Consultation"
    if (location.state?.explicitNew) {
      sessionStorage.removeItem(activeSessionKey);
      return;
    }

    const savedId = sessionStorage.getItem(activeSessionKey);
    if (savedId && conversations.some((c) => c.id === savedId)) {
      navigate(`/patient/consultation/${savedId}`, { replace: true });
    }
  }, [conversationId, conversations, isLoadingConversations, activeSessionKey, location.state, navigate]);

  // 3. Keep session storage synchronized with current conversationId
  useEffect(() => {
    if (conversationId && activeSessionKey) {
      sessionStorage.setItem(activeSessionKey, conversationId);
    }
  }, [conversationId, activeSessionKey]);

  // 4. Fetch messages whenever active conversationId changes (supports browser refresh & deep links)
  useEffect(() => {
    // Stop any active speech synthesis and voice recognition when navigating or changing conversations
    stopSpeech();
    resetVoiceState();

    // If no conversationId is in the URL, clear messages and errors
    if (!conversationId) {
      setMessages([]);
      setMessagesError(null);
      setDocuments([]);
      setDocumentError(null);
      setIsLoadingMessages(false);
      return;
    }

    // If this route transition was triggered by handleSend creating a new conversation,
    // do NOT abort the in-flight stream or overwrite the optimistic messages!
    if (isNewConversationInitiatedRef.current === conversationId) {
      isNewConversationInitiatedRef.current = null;
      return;
    }

    // Abort any ongoing stream from a previous conversation
    if (streamAbortControllerRef.current) {
      streamAbortControllerRef.current.abort();
      streamAbortControllerRef.current = null;
      setIsStreaming(false);
    }

    let isCancelled = false;

    // Load messages for active conversation
    const loadMessages = async () => {
      try {
        setIsLoadingMessages(true);
        setMessagesError(null);
        const res = await conversationService.fetchMessages(conversationId);
        if (!isCancelled && res?.success && Array.isArray(res.messages)) {
          setMessages(res.messages);

          // Title derivation: if conversation has no meaningful backend title,
          // safely derive a temporary title from the first user message without extra Gemini requests.
          const firstUserMsg = res.messages.find((m) => m.role === 'user');
          if (firstUserMsg?.content) {
            setConversations((prev) =>
              prev.map((c) => {
                if (c.id === conversationId) {
                  const derived = deriveConversationTitle(c, firstUserMsg.content);
                  return { ...c, displayTitle: derived };
                }
                return c;
              })
            );
          }
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Failed to fetch messages for conversation:', err.message);
          setMessages([]);
          if (err.status === 404) {
            setMessagesError('Consultation not found or belongs to another user.');
            if (activeSessionKey) sessionStorage.removeItem(activeSessionKey);
          } else {
            setMessagesError(err.message || 'Failed to load consultation messages.');
          }
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingMessages(false);
        }
      }
    };

    // Load attached documents for active conversation (Step 3.1)
    const loadDocuments = async () => {
      try {
        const docRes = await documentService.getDocuments(conversationId);
        if (!isCancelled && docRes?.success && Array.isArray(docRes.documents)) {
          setDocuments((prev) => {
            const filteredServerDocs = docRes.documents.filter(
              (d) => !deletingIdsRef.current.has(d.id)
            );
            const serverDocIds = new Set(filteredServerDocs.map((d) => d.id));
            const pendingPrevDocs = prev.filter(
              (d) => !serverDocIds.has(d.id) && !deletingIdsRef.current.has(d.id)
            );
            return [...filteredServerDocs, ...pendingPrevDocs];
          });
        }
      } catch (err) {
        if (!isCancelled) {
          console.warn('Failed to load consultation documents:', err.message);
        }
      }
    };

    loadMessages();
    loadDocuments();

    return () => {
      isCancelled = true;
    };
  }, [conversationId, activeSessionKey, stopSpeech, resetVoiceState]);

  // Poll active document statuses if any document is currently queued or in-flight processing (Step 3.2)
  useEffect(() => {
    if (!conversationId) return;

    const hasIncompleteProcessing = documents.some((d) => {
      const status = d.status || d.uploadStatus;
      return status === 'uploaded' || status === 'processing';
    });

    if (!hasIncompleteProcessing) return;

    const timer = setInterval(async () => {
      try {
        const res = await documentService.getDocuments(conversationId);
        if (res?.success && Array.isArray(res.documents)) {
          setDocuments((prev) => {
            const filteredServerDocs = res.documents.filter(
              (d) => !deletingIdsRef.current.has(d.id)
            );
            const serverDocIds = new Set(filteredServerDocs.map((d) => d.id));
            const pendingPrevDocs = prev.filter(
              (d) => !serverDocIds.has(d.id) && !deletingIdsRef.current.has(d.id)
            );
            return [...filteredServerDocs, ...pendingPrevDocs];
          });
        }
      } catch (err) {
        console.warn('Failed to refresh document processing status:', err.message);
      }
    }, 1500);

    return () => clearInterval(timer);
  }, [conversationId, documents]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (streamAbortControllerRef.current) {
        streamAbortControllerRef.current.abort();
      }
    };
  }, []);

  // 5. Navigation handlers
  const handleNewChat = () => {
    // Abort active stream if any
    if (streamAbortControllerRef.current) {
      streamAbortControllerRef.current.abort();
      streamAbortControllerRef.current = null;
      setIsStreaming(false);
    }

    // Abort in-flight draft uploads and clear draft state
    clearDrafts();

    if (activeSessionKey) {
      sessionStorage.removeItem(activeSessionKey);
    }

    stopSpeech();
    resetVoiceState();
    setMessages([]);
    setMessagesError(null);
    setDocuments([]);
    setDocumentError(null);
    clearDrafts();
    setInput('');
    navigate('/patient/consultation', { state: { explicitNew: true } });
  };

  const handleSelectConversation = (id) => {
    if (id !== conversationId) {
      // Abort active stream before switching
      if (streamAbortControllerRef.current) {
        streamAbortControllerRef.current.abort();
        streamAbortControllerRef.current = null;
        setIsStreaming(false);
      }

      // Abort in-flight draft uploads and clear draft state before switching
      clearDrafts();
      setDocumentError(null);

      stopSpeech();
      resetVoiceState();
      navigate(`/patient/consultation/${id}`);
    }
  };

  // 6. Send Message & Progressive SSE Streaming Orchestration
  const handleSend = async (customPrompt) => {
    const promptText = (customPrompt !== undefined ? customPrompt : input).trim();
    const attachmentsToSend = [...readyAttachmentIds];

    // Enforce send gating: must have text OR at least one ready attachment; no pending uploads or failures
    if (
      (!promptText && attachmentsToSend.length === 0) ||
      isStreaming ||
      isSubmittingRef.current ||
      hasUploadingDrafts ||
      hasFailedDrafts
    ) {
      return;
    }

    // Stop active speech playback and voice recognition when user sends message
    stopSpeech();
    resetVoiceState();

    isSubmittingRef.current = true;
    setInput('');
    setLastFailedPrompt(promptText);

    let targetConvId = conversationId;

    // If starting from clean state (no active conversationId), initialize one first
    if (!targetConvId) {
      try {
        const titleSnippet = promptText
          ? (promptText.length > 40 ? `${promptText.slice(0, 40)}...` : promptText)
          : drafts[0]?.fileName?.replace(/\.pdf$/i, '').slice(0, 40) || 'Medical Report Consultation';

        const createRes = await conversationService.createConversation(titleSnippet);

        if (createRes?.success && createRes.conversation?.id) {
          const newConv = {
            ...createRes.conversation,
            displayTitle: titleSnippet,
          };
          targetConvId = newConv.id;
          isNewConversationInitiatedRef.current = newConv.id;
          activeConversationIdRef.current = newConv.id;

          // Prepend and sort conversations list
          setConversations((prev) => sortConversationsByRecent([newConv, ...prev]));

          // Persist to session storage and synchronize URL
          if (activeSessionKey) {
            sessionStorage.setItem(activeSessionKey, newConv.id);
          }
          navigate(`/patient/consultation/${newConv.id}`, { replace: true });
        } else {
          throw new Error('Could not initialize consultation session.');
        }
      } catch (err) {
        console.error('Conversation creation failed:', err.message);
        isSubmittingRef.current = false;
        return;
      }
    }

    // Snapshot ready drafts being committed for optimistic bubble display
    const optimisticAttachments = drafts
      .filter((d) => d.status === 'ready' && attachmentsToSend.includes(d.attachmentId))
      .map((d) => ({
        documentId: d.attachmentId,
        originalName: d.fileName,
        fileSize: d.fileSize,
      }));

    // Clear draft attachments from composer immediately upon sending (committed)
    clearDrafts();

    // Set up optimistic message entries
    const tempUserId = `temp-user-${Date.now()}`;
    const tempAssistantId = `temp-assistant-${Date.now()}`;

    const optimisticUserMsg = {
      id: tempUserId,
      role: 'user',
      content: promptText,
      attachments: optimisticAttachments,
      status: 'sending',
      createdAt: new Date().toISOString(),
    };

    const optimisticAssistantMsg = {
      id: tempAssistantId,
      role: 'assistant',
      content: '',
      status: 'streaming',
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticUserMsg, optimisticAssistantMsg]);
    setIsStreaming(true);

    // Create AbortController for stream cancellation
    const controller = new AbortController();
    streamAbortControllerRef.current = controller;

    try {
      await conversationService.streamMessage(targetConvId, promptText, {
        attachments: attachmentsToSend,
        signal: controller.signal,
        onStart: (data) => {
          if (data?.userMessage) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempUserId ? { ...data.userMessage, status: 'completed' } : m
              )
            );
          }
        },
        onDelta: (data) => {
          if (data?.delta) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempAssistantId
                  ? { ...m, content: m.content + data.delta, status: 'streaming' }
                  : m
              )
            );
          }
        },
        onComplete: (data) => {
          if (data?.message) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempAssistantId ? { ...data.message, status: 'completed' } : m
              )
            );

            // Update sidebar order and timestamp with most recently updated at top
            setConversations((prev) => {
              const updated = prev.map((c) =>
                c.id === targetConvId
                  ? {
                      ...c,
                      lastMessageAt: data.message.createdAt || new Date().toISOString(),
                      displayTitle:
                        c.displayTitle ||
                        deriveConversationTitle(c, promptText || 'Medical Report Consultation'),
                    }
                  : c
              );
              return sortConversationsByRecent(updated);
            });

            // Refresh persisted documents for header counter badge
            documentService.getDocuments(targetConvId).then((res) => {
              if (res?.success && Array.isArray(res.documents)) {
                setDocuments(res.documents);
              }
            }).catch(() => {});
          }
        },
        onError: (_data) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempAssistantId ? { ...m, status: 'failed' } : m
            )
          );
        },
      });
    } catch (err) {
      if (err.name !== 'AbortError' && err.name !== 'CanceledError') {
        console.warn('Streaming error occurred:', err.message);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempAssistantId ? { ...m, status: 'failed' } : m
          )
        );
      }
    } finally {
      setIsStreaming(false);
      streamAbortControllerRef.current = null;
      isSubmittingRef.current = false;
    }
  };

  // 7. Retry failed assistant message
  const handleRetry = (_failedMsg) => {
    if (lastFailedPrompt) {
      setMessages((prev) => prev.filter((m) => m.status !== 'failed'));
      handleSend(lastFailedPrompt);
    }
  };

  // Derive header title
  const currentTitle =
    activeConv?.displayTitle ||
    (activeConv?.title && activeConv.title !== 'New Consultation' ? activeConv.title : null) ||
    (conversationId ? 'Consultation Session' : 'New Clinical Consultation');

  const showWelcome = !conversationId && messages.length === 0 && !isLoadingMessages;

  return (
    <div className="consultation-page">
      {/* Conversation Sidebar */}
      <ConversationSidebar
        conversations={conversations}
        activeId={conversationId}
        onSelect={handleSelectConversation}
        onNewChat={handleNewChat}
        isLoading={isLoadingConversations}
        error={conversationsError}
        onRetry={loadConversations}
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        isDesktopOpen={desktopSidebarOpen}
        onToggleDesktop={() => setDesktopSidebarOpen((prev) => !prev)}
      />

      {/* Main Chat Workspace */}
      <div className="chat-main">
        {/* Compact Header */}
        <header className="chat-main__header">
          <div className="chat-main__header-left">
            <button
              type="button"
              className="chat-sidebar-toggle-btn"
              onClick={() => {
                if (window.innerWidth <= 768) {
                  setMobileSidebarOpen((prev) => !prev);
                } else {
                  setDesktopSidebarOpen((prev) => !prev);
                }
              }}
              aria-label={desktopSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              title={desktopSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
            </button>

            <h1 className="chat-main__title" title={currentTitle}>
              {currentTitle}
            </h1>
          </div>

          <div className="chat-main__header-right">
            {/* Attached reports badge */}
            {documents.length > 0 && (
              <div
                className="chat-main__docs-badge"
                title={`${documents.length} medical report(s) attached to this consultation`}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span>{documents.length} Report{documents.length > 1 ? 's' : ''}</span>
              </div>
            )}

            <div className="chat-main__badge" title="Verified AI intake dialog active">
              <span className="chat-main__badge-dot" aria-hidden="true" />
              <span>Intake Protocol</span>
            </div>
          </div>
        </header>

        {/* Message Area or Welcome Screen */}
        {showWelcome ? (
          <ChatWelcome
            patientName={user?.name || ''}
            onSelectPrompt={(selectedText) => handleSend(selectedText)}
          />
        ) : (
          <ChatMessageList
            messages={messages}
            isLoading={isLoadingMessages}
            error={messagesError}
            isStreaming={isStreaming}
            onRetry={handleRetry}
            onRetryLoading={() => {
              if (conversationId) {
                navigate(`/patient/consultation/${conversationId}`);
              }
            }}
            onNewChat={handleNewChat}
            speechSynthesisSupported={speechSynthesisSupported}
            activeSpeakingId={activeMessageId}
            onToggleSpeak={handleToggleSpeak}
          />
        )}

        {/* Fixed Bottom Input Bar */}
        <ChatInput
          value={input}
          onChange={setInput}
          onSend={(text) => handleSend(text !== undefined ? text : input)}
          disabled={isLoadingMessages || Boolean(messagesError)}
          isStreaming={isStreaming}
          speechRecognitionSupported={speechRecognitionSupported}
          voiceState={voiceState}
          onToggleVoice={handleToggleVoice}
          voiceError={voiceError}
          interimTranscript={interimTranscript}
          draftAttachments={drafts}
          onAttachFiles={(files) => addDrafts(files, conversationId)}
          onRemoveDraft={removeDraft}
          onRetryDraft={(clientId) => retryDraft(clientId, conversationId)}
          documentError={documentError}
          onClearDocumentError={() => setDocumentError(null)}
          onSetDocumentError={setDocumentError}
        />
      </div>
    </div>
  );
}
