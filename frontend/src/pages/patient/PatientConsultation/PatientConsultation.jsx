import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import conversationService from '../../../services/conversationService';
import ConversationSidebar from './components/ConversationSidebar';
import ChatMessageList from './components/ChatMessageList';
import ChatInput from './components/ChatInput';
import ChatWelcome from './components/ChatWelcome';
import {
  deriveConversationTitle,
  sortConversationsByRecent,
} from './utils/conversationUtils';
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
  const [lastFailedPrompt, setLastFailedPrompt] = useState('');

  // Refs for race-condition prevention and stream abortion
  const isSubmittingRef = useRef(false);
  const streamAbortControllerRef = useRef(null);

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
    // If no conversationId is in the URL, clear messages and errors
    if (!conversationId) {
      setMessages([]);
      setMessagesError(null);
      setIsLoadingMessages(false);
      return;
    }

    // Abort any ongoing stream from a previous conversation
    if (streamAbortControllerRef.current) {
      streamAbortControllerRef.current.abort();
      streamAbortControllerRef.current = null;
      setIsStreaming(false);
    }

    let isCancelled = false;

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

    loadMessages();

    return () => {
      isCancelled = true;
    };
  }, [conversationId, activeSessionKey]);

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

    if (activeSessionKey) {
      sessionStorage.removeItem(activeSessionKey);
    }

    setMessages([]);
    setMessagesError(null);
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
      navigate(`/patient/consultation/${id}`);
    }
  };

  // 6. Send Message & Progressive SSE Streaming Orchestration
  const handleSend = async (customPrompt) => {
    const promptText = (customPrompt || input).trim();
    if (!promptText || isStreaming || isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    setInput('');
    setLastFailedPrompt(promptText);

    let targetConvId = conversationId;

    // If starting from clean state (no active conversationId), create one first
    if (!targetConvId) {
      try {
        const titleSnippet =
          promptText.length > 40 ? `${promptText.slice(0, 40)}...` : promptText;
        const createRes = await conversationService.createConversation(titleSnippet);

        if (createRes?.success && createRes.conversation?.id) {
          const newConv = {
            ...createRes.conversation,
            displayTitle: titleSnippet,
          };
          targetConvId = newConv.id;

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

    // Set up optimistic message entries
    const tempUserId = `temp-user-${Date.now()}`;
    const tempAssistantId = `temp-assistant-${Date.now()}`;

    const optimisticUserMsg = {
      id: tempUserId,
      role: 'user',
      content: promptText,
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
                        deriveConversationTitle(c, promptText),
                    }
                  : c
              );
              return sortConversationsByRecent(updated);
            });
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
      />

      {/* Main Chat Workspace */}
      <div className="chat-main">
        {/* Top Header */}
        <header className="chat-main__header">
          <div className="chat-main__header-left">
            <button
              type="button"
              className="chat-sidebar-toggle-btn"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Open past consultations menu"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
              <span>Chats</span>
            </button>

            <h1 className="chat-main__title" title={currentTitle}>
              {currentTitle}
            </h1>
          </div>

          <div className="chat-main__badge" title="Verified clinical intake dialog model">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>Intake Protocol Active</span>
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
          />
        )}

        {/* Fixed Bottom Input Bar */}
        <ChatInput
          value={input}
          onChange={setInput}
          onSend={() => handleSend(input)}
          disabled={isLoadingMessages || Boolean(messagesError)}
          isStreaming={isStreaming}
        />
      </div>
    </div>
  );
}
