import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, Sparkles, Trash2, AlertTriangle } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import ChatMarkdown from './ChatMarkdown';
import { useChatbotPageContext } from '../../context/ChatbotPageContext';
import { useChatRateLimit } from '../../hooks/useChatRateLimit';
import { streamChatMessage } from '../../api/chatbot';

const WINDOW_SIZE = 20;
const MAX_STORED  = 100;

const WELCOME_MESSAGE = {
  id: 'welcome',
  role: 'assistant',
  content: "Hi! I'm your SurveyAgent assistant. Ask me anything about your surveys or how to use the platform.",
  isTyping: false,
};

function historyKey(userId) {
  return `sa_chat_history_${userId}`;
}

function loadHistory(userId) {
  try {
    const raw = localStorage.getItem(historyKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    console.warn('[FloatingChatbot] Failed to parse chat history from localStorage');
    return null;
  }
}

function saveHistory(messages, userId) {
  try {
    const toStore = messages.filter((m) => !m.isTyping).slice(-MAX_STORED);
    localStorage.setItem(historyKey(userId), JSON.stringify(toStore));
  } catch {}
}

export default function FloatingChatbot() {
  const { user } = useAuth();
  const location = useLocation();
  const { pageContext } = useChatbotPageContext();
  const { isBlocked, showWarning, remaining, countdown, incrementCount, handleRateLimit } = useChatRateLimit(user?.user_id);

  const [isOpen, setIsOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const abortRef = useRef(null);
  const historyLoadedRef = useRef(false);

  // Load per-user history once when user resolves
  useEffect(() => {
    if (!user?.user_id || historyLoadedRef.current) return;
    historyLoadedRef.current = true;
    const saved = loadHistory(user.user_id);
    if (saved) setMessages(saved);
  }, [user?.user_id]);

  // Persist history keyed by user
  useEffect(() => {
    if (!user?.user_id) return;
    saveHistory(messages, user.user_id);
  }, [messages, user?.user_id]);

  useEffect(() => {
    const t = setTimeout(() => setShowTooltip(false), 4000);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);
  useEffect(() => {
    if (isOpen) textareaRef.current?.focus();
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
    setShowTooltip(false);
    setHasOpened(true);
  };

  const handleClearHistory = () => {
    setMessages([WELCOME_MESSAGE]);
    if (user?.user_id) localStorage.removeItem(historyKey(user.user_id));
  };

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming || isBlocked) return;

    const userMsgId      = Date.now();
    const assistantMsgId = Date.now() + 1;

    const cleanHistory    = messages.filter((m) => !m.isTyping);
    const windowedHistory = cleanHistory
      .slice(-WINDOW_SIZE)
      .map((m) => ({ role: m.role, content: m.content }));

    const userContext = {
      name:         user?.name ?? null,
      org_name:     user?.org_name ?? null,
      current_page: location.pathname,
    };

    setMessages((prev) => [
      ...prev,
      { id: userMsgId,      role: 'user',     content: text, isTyping: false },
      { id: assistantMsgId, role: 'assistant', content: '',   isTyping: true  },
    ]);
    setInput('');
    setIsStreaming(true);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const controller = new AbortController();
    abortRef.current = controller;

    await streamChatMessage({
      data: {
        message:      text,
        history:      windowedHistory,
        context:      userContext,
        page_context: pageContext || null,
      },
      onToken: (token) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, content: m.content + token, isTyping: false }
              : m
          )
        );
      },
      onDone: () => {
        incrementCount();
        setIsStreaming(false);
        abortRef.current = null;
      },
      onError: () => {
        // Server already counted this request — keep client in sync
        incrementCount();
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, content: 'Sorry, something went wrong. Please try again.', isTyping: false }
              : m
          )
        );
        setIsStreaming(false);
        abortRef.current = null;
      },
      onRateLimit: (retryAfter) => {
        // Remove typing placeholder, show block state
        setMessages((prev) => prev.filter((m) => m.id !== assistantMsgId));
        handleRateLimit(retryAfter);
        setIsStreaming(false);
        abortRef.current = null;
      },
      signal: controller.signal,
    });
  }, [input, isStreaming, isBlocked, messages, user, location.pathname, pageContext, incrementCount, handleRateLimit]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaInput = (e) => {
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
    setInput(el.value);
  };

  // Hide on unauthenticated pages and on the interview UI (respondent view + admin test)
  if (!user || location.pathname.startsWith('/interview/')) return null;

  const visibleCount     = messages.filter((m) => !m.isTyping).length;
  const showWindowBanner = visibleCount > WINDOW_SIZE + 1;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.96 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="flex flex-col w-80 sm:w-[360px] h-[480px] bg-card border border-card-border rounded-2xl shadow-xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-card-border bg-card shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-serif text-text-primary leading-tight">SurveyAgent AI</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full inline-block ${isBlocked ? 'bg-error' : 'bg-success'}`} />
                    <p className="text-xs text-text-muted font-sans leading-tight">
                      {isBlocked ? 'Blocked' : 'Online'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={handleClearHistory}
                  title="Clear conversation"
                  className="text-text-muted hover:text-error transition-colors p-1.5 rounded-lg hover:bg-background"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-text-muted hover:text-text-primary transition-colors p-1.5 rounded-lg hover:bg-background"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sliding-window notice */}
            {showWindowBanner && !isBlocked && (
              <div className="px-4 py-1.5 bg-accent/5 border-b border-accent/10 shrink-0">
                <p className="text-xs text-text-muted/70 font-sans text-center">
                  Showing full history · AI uses the last {WINDOW_SIZE / 2} exchanges for context
                </p>
              </div>
            )}

            {/* Rate-limit warning banner */}
            {showWarning && (
              <div className="flex items-center gap-2 px-4 py-1.5 bg-error/5 border-b border-error/15 shrink-0">
                <AlertTriangle className="w-3 h-3 text-error/70 shrink-0" />
                <p className="text-xs text-error/80 font-sans">
                  {remaining} message{remaining !== 1 ? 's' : ''} remaining this hour
                </p>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-background">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-full bg-accent/15 flex items-center justify-center shrink-0 mb-0.5">
                      <Bot className="w-3.5 h-3.5 text-accent" />
                    </div>
                  )}
                  <div
                    className={`font-sans ${
                      msg.role === 'user'
                        ? 'max-w-[78%] px-3.5 py-2.5 text-sm leading-relaxed bg-accent text-white rounded-2xl rounded-br-sm'
                        : 'max-w-[88%] px-3.5 py-2.5 bg-card border border-card-border text-text-primary rounded-2xl rounded-bl-sm'
                    }`}
                  >
                    {msg.isTyping ? (
                      <div className="flex items-center gap-1 py-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-text-muted/40 animate-[typing-dot_1.4s_ease-in-out_infinite] typing-dot-1" />
                        <span className="w-1.5 h-1.5 rounded-full bg-text-muted/40 animate-[typing-dot_1.4s_ease-in-out_infinite] typing-dot-2" />
                        <span className="w-1.5 h-1.5 rounded-full bg-text-muted/40 animate-[typing-dot_1.4s_ease-in-out_infinite] typing-dot-3" />
                      </div>
                    ) : msg.role === 'assistant' ? (
                      <ChatMarkdown content={msg.content} />
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area — blocked state OR normal */}
            {isBlocked ? (
              <div className="px-4 py-5 border-t border-error/15 bg-error/5 shrink-0 text-center">
                <AlertTriangle className="w-5 h-5 text-error/60 mx-auto mb-2" />
                <p className="text-sm font-sans font-medium text-error">Chat limit reached</p>
                <p className="text-xs text-text-muted font-sans mt-1">
                  You've used all 20 messages for this hour.
                </p>
                <p className="text-sm font-sans font-medium text-text-primary mt-3">
                  Available again in{' '}
                  <span className="text-accent tabular-nums">{countdown}</span>
                </p>
              </div>
            ) : (
              <div className="px-3 py-3 border-t border-card-border bg-card shrink-0">
                <div className="flex items-end gap-2 bg-background border border-card-border rounded-xl px-3 py-2 focus-within:border-accent/50 transition-colors">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleTextareaInput}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask a question..."
                    rows={1}
                    disabled={isStreaming}
                    className="flex-1 bg-transparent text-sm font-sans text-text-primary placeholder:text-text-muted/60 resize-none outline-none leading-5 disabled:opacity-60"
                    style={{ minHeight: '20px', maxHeight: '96px' }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isStreaming}
                    className="w-7 h-7 rounded-full bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0 mb-0.5"
                  >
                    <Send className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
                <p className="text-xs text-text-muted/50 font-sans text-center mt-2">
                  Press Enter to send · Shift+Enter for new line
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trigger row */}
      <div className="flex items-center gap-3">
        <AnimatePresence>
          {!isOpen && showTooltip && (
            <motion.div
              initial={{ opacity: 0, x: 10, scale: 0.92 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 10, scale: 0.92 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative bg-card border border-card-border rounded-xl px-3.5 py-2 shadow-md"
            >
              <p className="text-sm font-sans text-text-primary whitespace-nowrap">Need help? 👋</p>
              <span className="absolute right-[-5px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-card border-t border-r border-card-border rotate-45" />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative">
          {!hasOpened && !isOpen && (
            <>
              <span className="absolute inset-0 rounded-full bg-accent opacity-25 animate-ping" />
              <span className="absolute inset-0 rounded-full bg-accent opacity-15 animate-ping" style={{ animationDelay: '0.6s' }} />
            </>
          )}
          {!hasOpened && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: 'spring', stiffness: 260, damping: 18 }}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-accent border-2 border-white flex items-center justify-center z-10 shadow-sm"
            >
              <Sparkles className="w-2.5 h-2.5 text-white" />
            </motion.span>
          )}

          <motion.button
            onClick={handleToggle}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            className="relative w-12 h-12 rounded-full bg-accent hover:bg-accent-hover shadow-lg flex items-center justify-center text-white transition-colors"
            aria-label={isOpen ? 'Close chat' : 'Open chat'}
          >
            <AnimatePresence mode="wait" initial={false}>
              {isOpen ? (
                <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.12 }} className="flex items-center justify-center">
                  <X className="w-5 h-5" />
                </motion.span>
              ) : (
                <motion.span key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.12 }} className="flex items-center justify-center">
                  <MessageCircle className="w-5 h-5" />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>
    </div>
  );
}
