/**
 * ============================================================
 * Chalo Schools RAG Chat Widget
 * ============================================================
 * A production-ready, self-contained React chat component for
 * the Chalo Schools RAG chatbot with SSE streaming support.
 *
 * Props:
 *   apiUrl       - Base URL of the RAG API (required)
 *   apiKey       - API key for authentication (required)
 *   schoolId     - School identifier (required)
 *   role         - User role: 'parent' | 'teacher' | 'admin' (default: 'parent')
 *   userMetadata - Additional user metadata object
 *   sessionId    - Optional session ID for conversation continuity
 *
 * Usage:
 *   import ChatWidget from './ChatWidget';
 *   <ChatWidget apiUrl="https://api.chaloschools.com" apiKey="sk-..." schoolId="school_123" />
 *
 * @version 2.0.0
 * @license MIT
 * ============================================================
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useReducer,
} from 'react';
import './ChatWidget.css';

// ─── Constants ────────────────────────────────────────────────────────────────

const STREAM_TIMEOUT_MS = 30000;
const CONFIG_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

// ─── Utility Helpers ──────────────────────────────────────────────────────────

/** Generate a UUID v4 */
function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Format timestamp to HH:MM */
function formatTime(date) {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/** Detect dark mode preference */
function getSystemTheme() {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

/** Debounce utility */
function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// ─── SVG Icons (inline, no external deps) ─────────────────────────────────────

const Icons = {
  Chat: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  Close: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Send: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
  Refresh: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  ),
  Document: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  AlertCircle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  Globe: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="10" height="10">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
};

// ─── Message Reducer ──────────────────────────────────────────────────────────

const MESSAGE_ACTIONS = {
  ADD: 'ADD',
  UPDATE_STREAMING: 'UPDATE_STREAMING',
  FINALIZE_STREAM: 'FINALIZE_STREAM',
  SET_ERROR: 'SET_ERROR',
  CLEAR: 'CLEAR',
};

function messageReducer(state, action) {
  switch (action.type) {
    case MESSAGE_ACTIONS.ADD:
      return [...state, action.payload];

    case MESSAGE_ACTIONS.UPDATE_STREAMING:
      return state.map((msg) =>
        msg.id === action.payload.id
          ? { ...msg, text: msg.text + action.payload.token }
          : msg
      );

    case MESSAGE_ACTIONS.FINALIZE_STREAM:
      return state.map((msg) =>
        msg.id === action.payload.id
          ? {
              ...msg,
              isStreaming: false,
              sources: action.payload.sources || [],
              confidence: action.payload.confidence,
              followUps: action.payload.follow_up || [],
              language: action.payload.language,
            }
          : msg
      );

    case MESSAGE_ACTIONS.SET_ERROR:
      return state.map((msg) =>
        msg.id === action.payload.id
          ? { ...msg, isStreaming: false, error: action.payload.error }
          : msg
      );

    case MESSAGE_ACTIONS.CLEAR:
      return [];

    default:
      return state;
  }
}

// ─── Custom Hook: useSchoolConfig ─────────────────────────────────────────────

function useSchoolConfig(apiUrl, schoolId) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const cacheRef = useRef({ data: null, ts: 0 });

  useEffect(() => {
    if (!apiUrl || !schoolId) return;

    // Return cached if fresh
    const cached = cacheRef.current;
    if (cached.data && Date.now() - cached.ts < CONFIG_CACHE_TTL_MS) {
      setConfig(cached.data);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchConfig() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`${apiUrl}/config/school/${schoolId}`, {
          headers: { Accept: 'application/json' },
        });

        if (!res.ok) throw new Error(`Config fetch failed: ${res.status}`);

        const data = await res.json();
        if (!cancelled) {
          cacheRef.current = { data, ts: Date.now() };
          setConfig(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          // Use fallback config
          setConfig({
            school_name: 'Chalo Schools',
            primary_color: '#4f46e5',
            welcome_message: 'Hi! I can help you find information about the school. Ask me anything!',
            recent_documents: [],
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchConfig();
    return () => { cancelled = true; };
  }, [apiUrl, schoolId]);

  return { config, loading, error };
}

// ─── Custom Hook: useSSEStream ────────────────────────────────────────────────

function useSSEStream(apiUrl, apiKey) {
  const abortControllerRef = useRef(null);

  const stream = useCallback(
    async ({ message, sessionId, schoolId, role, metadata, onToken, onDone, onError }) => {
      // Abort any existing stream
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const timeoutId = setTimeout(() => {
        controller.abort();
        onError?.('Request timed out. Please try again.');
      }, STREAM_TIMEOUT_MS);

      try {
        const response = await fetch(`${apiUrl}/chat/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey,
            Accept: 'text/event-stream',
          },
          body: JSON.stringify({
            message,
            session_id: sessionId,
            school_id: schoolId,
            role,
            metadata: metadata || {},
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errText = await response.text().catch(() => '');
          throw new Error(
            response.status === 429
              ? 'Too many requests. Please wait a moment.'
              : response.status === 401
              ? 'Authentication failed. Please check your API key.'
              : response.status >= 500
              ? 'Server is temporarily unavailable. Please try again.'
              : `Request failed (${response.status}): ${errText || 'Unknown error'}`
          );
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;

            const rawData = line.slice(6); // Remove "data: "

            // Check for event type from preceding "event:" line or detect by content
            if (rawData.startsWith('{')) {
              // JSON payload — this is the "done" event
              try {
                const parsed = JSON.parse(rawData);
                clearTimeout(timeoutId);
                onDone?.(parsed);
              } catch (e) {
                // Malformed JSON, treat as token
                onToken?.(rawData);
              }
            } else {
              // Plain text token
              onToken?.(rawData);
            }
          }
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          // Already handled by timeout or intentional abort
          return;
        }
        clearTimeout(timeoutId);
        onError?.(err.message || 'An unexpected error occurred.');
      } finally {
        clearTimeout(timeoutId);
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    },
    [apiUrl, apiKey]
  );

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return { stream, abort };
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

/** Typing indicator */
function TypingIndicator() {
  return (
    <div className="cw-typing" aria-label="Assistant is typing">
      <div className="cw-typing__avatar">AI</div>
      <div className="cw-typing__dots">
        <span className="cw-typing__dot" />
        <span className="cw-typing__dot" />
        <span className="cw-typing__dot" />
      </div>
    </div>
  );
}

/** Source citation card */
function SourceCard({ source }) {
  return (
    <div
      className="cw-source-card"
      title={`${source.document || source.name} — Page ${source.page || '?'}`}
      role="button"
      tabIndex={0}
    >
      <div className="cw-source-card__icon">
        <Icons.Document />
      </div>
      <div className="cw-source-card__info">
        <div className="cw-source-card__name">{source.document || source.name}</div>
        <div className="cw-source-card__page">
          {source.page ? `Page ${source.page}` : 'Reference'}
        </div>
      </div>
    </div>
  );
}

/** Confidence indicator */
function ConfidenceIndicator({ confidence }) {
  if (confidence == null) return null;

  const level =
    confidence >= 0.8 ? 'high' : confidence >= 0.5 ? 'medium' : 'low';
  const label =
    level === 'high' ? 'High confidence' : level === 'medium' ? 'Moderate confidence' : 'Low confidence';

  return (
    <span className="cw-confidence" title={label}>
      <span className={`cw-confidence__dot cw-confidence__dot--${level}`} />
      <span>{label}</span>
    </span>
  );
}

/** Language badge */
function LanguageBadge({ language }) {
  if (!language) return null;
  return (
    <span className="cw-lang-badge" title={`Detected language: ${language}`}>
      <Icons.Globe />
      {language}
    </span>
  );
}

/** Follow-up chips */
function FollowUpChips({ followUps, onSelect }) {
  if (!followUps?.length) return null;
  return (
    <div className="cw-followups" role="list" aria-label="Suggested questions">
      {followUps.map((q, i) => (
        <button
          key={i}
          className="cw-chip"
          onClick={() => onSelect(q)}
          role="listitem"
          aria-label={`Ask: ${q}`}
        >
          {q}
        </button>
      ))}
    </div>
  );
}

/** Welcome card */
function WelcomeCard({ config, logo }) {
  if (!config) return null;
  return (
    <div className="cw-welcome">
      <div className="cw-welcome__icon">
        {logo ? (
          <img src={logo} alt={config.school_name} />
        ) : (
          <span style={{ fontSize: '24px' }}>🎓</span>
        )}
      </div>
      <div className="cw-welcome__title">
        {config.welcome_message || `Welcome to ${config.school_name}!`}
      </div>
      <div className="cw-welcome__subtitle">
        I'm your AI assistant. Ask me anything about the school — admissions,
        policies, events, fees, and more.
      </div>
      {config.recent_documents?.length > 0 && (
        <div className="cw-welcome__docs">
          <div className="cw-welcome__docs-title">📄 Recently Updated</div>
          {config.recent_documents.slice(0, 4).map((doc, i) => (
            <div key={i} className="cw-welcome__doc-item">
              {typeof doc === 'string' ? doc : doc.name || doc.title}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Error banner */
function ErrorBanner({ message, onRetry, onDismiss }) {
  return (
    <div className="cw-error" role="alert">
      <span className="cw-error__icon">
        <Icons.AlertCircle />
      </span>
      <span>{message}</span>
      {onRetry && (
        <button className="cw-error__retry" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

/** Single chat message */
const ChatMessage = React.memo(function ChatMessage({ msg, onFollowUp }) {
  const isUser = msg.role === 'user';

  return (
    <div className={`cw-message cw-message--${isUser ? 'user' : 'bot'}`}>
      {!isUser && <div className="cw-message__avatar">AI</div>}
      <div className="cw-message__content">
        <div className="cw-message__bubble">
          {msg.text}
          {msg.isStreaming && <span className="cw-cursor">▊</span>}
        </div>

        {/* Metadata row */}
        {!isUser && !msg.isStreaming && (msg.confidence != null || msg.language) && (
          <div className="cw-message__meta">
            <ConfidenceIndicator confidence={msg.confidence} />
            <LanguageBadge language={msg.language} />
          </div>
        )}

        {/* Sources */}
        {!isUser && msg.sources?.length > 0 && (
          <div className="cw-sources">
            {msg.sources.map((src, i) => (
              <SourceCard key={i} source={src} />
            ))}
          </div>
        )}

        {/* Follow-ups */}
        {!isUser && !msg.isStreaming && msg.followUps?.length > 0 && (
          <FollowUpChips followUps={msg.followUps} onSelect={onFollowUp} />
        )}

        {/* Timestamp */}
        <div className="cw-message__time">{formatTime(msg.timestamp)}</div>
      </div>
      {isUser && <div className="cw-message__avatar">You</div>}
    </div>
  );
});

// ─── Main ChatWidget Component ────────────────────────────────────────────────

export default function ChatWidget({
  apiUrl,
  apiKey,
  schoolId,
  role = 'parent',
  userMetadata = {},
  sessionId: externalSessionId,
}) {
  // ─── State ──────────────────────────────────────────────────────────────────
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [messages, dispatch] = useReducer(messageReducer, []);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(
    () => externalSessionId || generateId()
  );
  const [hasNewMessage, setHasNewMessage] = useState(false);

  // ─── Refs ───────────────────────────────────────────────────────────────────
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // ─── Hooks ──────────────────────────────────────────────────────────────────
  const { config, loading: configLoading } = useSchoolConfig(apiUrl, schoolId);
  const { stream, abort } = useSSEStream(apiUrl, apiKey);

  // ─── Derived ────────────────────────────────────────────────────────────────
  const primaryColor = config?.primary_color || '#4f46e5';
  const schoolLogo = config?.logo || config?.logo_url;

  // CSS variable override for primary color
  const themeStyle = useMemo(
    () => ({
      '--cw-primary': primaryColor,
      '--cw-primary-hover': primaryColor + 'dd',
      '--cw-primary-light': primaryColor + '12',
      '--cw-user-bubble': primaryColor,
    }),
    [primaryColor]
  );

  // ─── Auto-scroll ────────────────────────────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  // ─── Focus input when opened ────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [isOpen]);

  // ─── New message notification ───────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen && messages.length > 0) {
      const last = messages[messages.length - 1];
      if (last.role === 'bot' && !last.isStreaming) {
        setHasNewMessage(true);
      }
    }
  }, [messages, isOpen]);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setIsClosing(false);
    setHasNewMessage(false);
  }, []);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 250);
  }, []);

  const handleToggle = useCallback(() => {
    if (isOpen) handleClose();
    else handleOpen();
  }, [isOpen, handleOpen, handleClose]);

  const handleNewConversation = useCallback(() => {
    abort();
    dispatch({ type: MESSAGE_ACTIONS.CLEAR });
    setSessionId(generateId());
    setIsTyping(false);
    setError(null);
  }, [abort]);

  const sendMessage = useCallback(
    (text) => {
      const trimmed = (text || '').trim();
      if (!trimmed || isTyping) return;

      setError(null);
      setInputValue('');

      // Add user message
      const userMsg = {
        id: generateId(),
        role: 'user',
        text: trimmed,
        timestamp: new Date(),
      };
      dispatch({ type: MESSAGE_ACTIONS.ADD, payload: userMsg });

      // Create bot message placeholder
      const botMsgId = generateId();
      const botMsg = {
        id: botMsgId,
        role: 'bot',
        text: '',
        timestamp: new Date(),
        isStreaming: true,
        sources: [],
        confidence: null,
        followUps: [],
        language: null,
      };
      dispatch({ type: MESSAGE_ACTIONS.ADD, payload: botMsg });
      setIsTyping(true);

      // Start streaming
      stream({
        message: trimmed,
        sessionId,
        schoolId,
        role,
        metadata: userMetadata,
        onToken: (token) => {
          dispatch({
            type: MESSAGE_ACTIONS.UPDATE_STREAMING,
            payload: { id: botMsgId, token },
          });
        },
        onDone: (data) => {
          setIsTyping(false);
          dispatch({
            type: MESSAGE_ACTIONS.FINALIZE_STREAM,
            payload: {
              id: botMsgId,
              sources: data.sources || [],
              confidence: data.confidence,
              follow_up: data.follow_up || data.follow_ups || [],
              language: data.language,
            },
          });
        },
        onError: (errMsg) => {
          setIsTyping(false);
          dispatch({
            type: MESSAGE_ACTIONS.SET_ERROR,
            payload: { id: botMsgId, error: errMsg },
          });
          setError(errMsg);
        },
      });
    },
    [isTyping, sessionId, schoolId, role, userMetadata, stream]
  );

  const handleSubmit = useCallback(
    (e) => {
      e?.preventDefault();
      sendMessage(inputValue);
    },
    [inputValue, sendMessage]
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleFollowUp = useCallback(
    (question) => {
      sendMessage(question);
    },
    [sendMessage]
  );

  const handleRetry = useCallback(() => {
    setError(null);
    // Find last user message and resend
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg) {
      // Remove the errored bot message
      const lastBotIdx = messages.length - 1;
      if (messages[lastBotIdx]?.error) {
        dispatch({ type: MESSAGE_ACTIONS.CLEAR });
        // Re-add all messages except the last errored one
        messages.slice(0, -1).forEach((msg) => {
          dispatch({ type: MESSAGE_ACTIONS.ADD, payload: msg });
        });
      }
      sendMessage(lastUserMsg.text);
    }
  }, [messages, sendMessage]);

  // Auto-resize textarea
  const handleInputChange = useCallback((e) => {
    setInputValue(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 100) + 'px';
  }, []);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="cw-container" style={themeStyle}>
      {/* Chat Window */}
      {isOpen && (
        <div
          className={`cw-window ${isClosing ? 'cw-window--closing' : ''}`}
          role="dialog"
          aria-label="Chat with school assistant"
          aria-modal="false"
        >
          {/* Header */}
          <header className="cw-header" style={{ background: primaryColor }}>
            {schoolLogo && (
              <img
                src={schoolLogo}
                alt=""
                className="cw-header__logo"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            )}
            <div className="cw-header__info">
              <div className="cw-header__title">
                {config?.school_name || 'School Assistant'}
              </div>
              <div className="cw-header__status">
                <span className="cw-header__status-dot" />
                <span>Online</span>
              </div>
            </div>
            <div className="cw-header__actions">
              <button
                className="cw-header__btn"
                onClick={handleNewConversation}
                title="New conversation"
                aria-label="Start new conversation"
              >
                <Icons.Refresh />
              </button>
              <button
                className="cw-header__btn"
                onClick={handleClose}
                title="Close"
                aria-label="Close chat"
              >
                <Icons.Close />
              </button>
            </div>
          </header>

          {/* Messages */}
          <div
            className="cw-messages"
            ref={messagesContainerRef}
            role="log"
            aria-live="polite"
            aria-label="Chat messages"
          >
            {/* Welcome card when no messages */}
            {messages.length === 0 && !configLoading && (
              <WelcomeCard config={config} logo={schoolLogo} />
            )}

            {/* Loading shimmer */}
            {configLoading && messages.length === 0 && (
              <div style={{ padding: '24px' }}>
                <div className="cw-shimmer cw-shimmer--full" />
                <div className="cw-shimmer cw-shimmer--medium" />
                <div className="cw-shimmer cw-shimmer--short" />
              </div>
            )}

            {/* Messages */}
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                msg={msg}
                onFollowUp={handleFollowUp}
              />
            ))}

            {/* Typing indicator */}
            {isTyping && messages[messages.length - 1]?.text === '' && (
              <TypingIndicator />
            )}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} aria-hidden="true" />
          </div>

          {/* Error banner */}
          {error && (
            <ErrorBanner
              message={error}
              onRetry={handleRetry}
              onDismiss={() => setError(null)}
            />
          )}

          {/* Input area */}
          <div className="cw-input-area">
            <form className="cw-input-wrapper" onSubmit={handleSubmit}>
              <textarea
                ref={inputRef}
                className="cw-input"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type your question…"
                rows={1}
                disabled={isTyping}
                aria-label="Message input"
                autoComplete="off"
              />
              <button
                type="submit"
                className="cw-send-btn"
                disabled={!inputValue.trim() || isTyping}
                aria-label="Send message"
              >
                <Icons.Send />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        className={`cw-fab ${isOpen ? 'cw-fab--open' : ''} ${
          !isOpen && hasNewMessage ? 'cw-fab--pulse' : ''
        }`}
        onClick={handleToggle}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
        aria-expanded={isOpen}
        style={{ background: primaryColor }}
      >
        <span className="cw-fab__icon">
          {isOpen ? <Icons.Close /> : <Icons.Chat />}
        </span>
        {hasNewMessage && !isOpen && (
          <span className="cw-fab__badge" aria-label="New message">
            1
          </span>
        )}
      </button>
    </div>
  );
}

// ─── PropTypes (runtime validation without importing prop-types) ───────────────

ChatWidget.displayName = 'ChatWidget';

/**
 * TypeScript-style prop documentation (for IDE support without TS):
 *
 * @typedef {Object} ChatWidgetProps
 * @property {string} apiUrl - Base URL of the RAG API
 * @property {string} apiKey - API key for authentication
 * @property {string} schoolId - School identifier
 * @property {'parent'|'teacher'|'admin'} [role='parent'] - User role
 * @property {Object} [userMetadata={}] - Additional user metadata
 * @property {string} [sessionId] - Optional session ID for continuity
 */
