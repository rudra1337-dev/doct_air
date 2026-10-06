import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import conversationService from '../../../services/conversationService';
import ConversationSidebar from './components/ConversationSidebar';
import ChatMessageList from './components/ChatMessageList';
import ChatInput from './components/ChatInput';
import ChatWelcome from './components/ChatWelcome';
import './PatientConsultation.css';

export default function PatientConsultation() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [messages, setMessages] = useState([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [input, setInput] = useState('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [lastFailedPrompt, setLastFailedPrompt] = useState('');

  const activeConv = conversations.find((c) => c.id === conversationId);

  // 1. Fetch conversations on initial mount
  const loadConversations = useCallback(async () => {
    try {
      setIsLoadingConversations(true);
      const res = await conversationService.fetchConversations();
      if (res?.success && Array.isArray(res.conversations)) {
        setConversations(res.conversations);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err.message);
    } finally {
      setIsLoadingConversations(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // 2. Fetch messages whenever active conversationId changes (supports browser refresh)
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    let isCancelled = false;

    const loadMessages = async () => {
      try {
        setIsLoadingMessages(true);
        const res = await conversationService.fetchMessages(conversationId);
        if (!isCancelled && res?.success && Array.isArray(res.messages)) {
          setMessages(res.messages);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Failed to fetch messages for conversation:', err.message);
          setMessages([]);
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
  }, [conversationId]);

  // 3. Navigation handlers
  const handleNewChat = () => {
    navigate('/patient/consultation');
    setMessages([]);
  };

  const handleSelectConversation = (id) => {
    if (id !== conversationId) {
      navigate(`/patient/consultation/${id}`);
    }
  };

  // 4. Send Message & SSE Streaming Orchestration
  const handleSend = async (customPrompt) => {
    const promptText = (customPrompt || input).trim();
    if (!promptText || isStreaming) return;

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
          const newConv = createRes.conversation;
          targetConvId = newConv.id;
          setConversations((prev) => [newConv, ...prev]);
          // Navigate without reloading
          navigate(`/patient/consultation/${newConv.id}`, { replace: true });
        } else {
          throw new Error('Could not initialize consultation session.');
        }
      } catch (err) {
        console.error('Conversation creation failed:', err.message);
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

    try {
      await conversationService.streamMessage(targetConvId, promptText, {
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

            // Update sidebar order with updated timestamp
            setConversations((prev) => {
              const updatedList = prev.map((c) =>
                c.id === targetConvId
                  ? { ...c, lastMessageAt: data.message.createdAt || new Date().toISOString() }
                  : c
              );
              return updatedList.sort(
                (a, b) => new Date(b.lastMessageAt || b.createdAt) - new Date(a.lastMessageAt || a.createdAt)
              );
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
      console.warn('Streaming error occurred:', err.message);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempAssistantId ? { ...m, status: 'failed' } : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  // 5. Retry failed prompt
  const handleRetry = (_failedMsg) => {
    if (lastFailedPrompt) {
      // Remove failed message from local state before retrying
      setMessages((prev) => prev.filter((m) => m.status !== 'failed'));
      handleSend(lastFailedPrompt);
    }
  };

  const showWelcome = !conversationId && messages.length === 0;

  return (
    <div className="consultation-page">
      {/* Conversation Sidebar */}
      <ConversationSidebar
        conversations={conversations}
        activeId={conversationId}
        onSelect={handleSelectConversation}
        onNewChat={handleNewChat}
        isLoading={isLoadingConversations}
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

            <h1 className="chat-main__title">
              {activeConv?.title || (conversationId ? 'Consultation Session' : 'New Clinical Consultation')}
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
            isStreaming={isStreaming}
            onRetry={handleRetry}
          />
        )}

        {/* Fixed Bottom Input Bar */}
        <ChatInput
          value={input}
          onChange={setInput}
          onSend={() => handleSend(input)}
          disabled={isLoadingMessages}
          isStreaming={isStreaming}
        />
      </div>
    </div>
  );
}
