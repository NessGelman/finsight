import { useState, useRef, useEffect } from 'react';
import {
  initAI,
  askAI,
  getAIProviderInfo,
  getGroqKey,
  saveGroqKey,
  hasGroqKey,
  reinitAI,
} from '../../services/freeAIService';
import { recordAIQuery } from '../../services/dataCollectionService';

const QUICK_ACTIONS = [
  "What's the cheapest option overall?",
  "Which has the lowest monthly payment?",
  "What are the risks of an MCA?",
  "Which option has the best approval odds for my profile?",
  "Compare the SBA loan vs. a term loan for my situation",
  "How much will I overpay with the most expensive option?",
];

// Render markdown-ish bold text (**text**)
function renderMessageContent(content) {
  if (!content) return null;
  const parts = content.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export function FreeAIChat({ results, inputs, rates }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiProvider, setAiProvider] = useState(null);
  const [initError, setInitError] = useState(null);

  // Groq key management
  const [showGroqSettings, setShowGroqSettings] = useState(false);
  const [groqKeyDraft, setGroqKeyDraft] = useState('');
  const [groqKeySaved, setGroqKeySaved] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function initialize() {
      try {
        const result = await initAI();
        if (cancelled) return;
        setAiProvider(result.provider);
        const info = getAIProviderInfo();
        setMessages([
          {
            role: 'assistant',
            content: `Hi! I'm your FinSight advisor powered by **${info.name}**. I've loaded your financing comparison — what would you like to know?`,
            timestamp: Date.now(),
          },
        ]);
      } catch (err) {
        if (!cancelled) setInitError(err.message);
      }
    }
    initialize();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize groq key draft when settings panel opens
  useEffect(() => {
    if (showGroqSettings) {
      setGroqKeyDraft(getGroqKey());
    }
  }, [showGroqSettings]);

  async function handleSaveGroqKey() {
    saveGroqKey(groqKeyDraft);
    setGroqKeySaved(true);
    setTimeout(() => setGroqKeySaved(false), 2000);

    const result = await reinitAI();
    setAiProvider(result.provider);
    const info = getAIProviderInfo();
    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: groqKeyDraft
          ? `✓ Groq API key saved. Now using **${info.name}** — enjoy much faster, smarter responses!`
          : 'Groq key cleared. Falling back to Pollinations AI.',
        timestamp: Date.now(),
      },
    ]);
    setShowGroqSettings(false);
  }

  async function handleSubmit(e, overrideQuestion = null) {
    if (e) e.preventDefault();
    const question = overrideQuestion ?? inputText.trim();
    if (!question || loading) return;

    const nextMessages = [
      ...messages,
      { role: 'user', content: question, timestamp: Date.now() },
    ];
    setMessages(nextMessages);
    setInputText('');
    setLoading(true);

    // Track AI query (count only — no question content stored)
    recordAIQuery(aiProvider || 'unknown');

    try {
      const response = await askAI(
        question,
        { results: results || [], rates },
        inputs || {},
      );
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response.message,
          timestamp: Date.now(),
          model: response.model,
        },
      ]);
    } catch (err) {
      const isTimeout = err.message?.toLowerCase().includes('timeout') || err.message?.toLowerCase().includes('timed out');
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: isTimeout
            ? 'The AI is taking too long right now. Try again in a moment — or add a free **Groq API key** (⚙) for much faster, more reliable responses.'
            : `Sorry, I hit an error: ${err.message}. Try again or add a Groq key (⚙) for a more reliable experience.`,
          timestamp: Date.now(),
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  if (initError) {
    return (
      <div className="free-ai-chat free-ai-chat--error">
        <p>AI Advisor unavailable: {initError}</p>
        <p className="free-ai-note">Try Chrome 127+ or add a free Groq API key below.</p>
      </div>
    );
  }

  if (!aiProvider) {
    return (
      <div className="free-ai-chat free-ai-chat--loading">
        <div className="free-ai-spinner" />
        <p>Initializing AI advisor…</p>
      </div>
    );
  }

  const providerInfo = getAIProviderInfo();
  const showQuickActions = messages.length <= 1 && !loading;
  const isGroq = aiProvider === 'groq';

  return (
    <div className="free-ai-chat">

      {/* Header */}
      <div className="free-ai-header">
        <div className="free-ai-avatar">{isGroq ? '⚡' : 'AI'}</div>
        <div className="free-ai-header-text">
          <strong>AI Financing Advisor</strong>
          <span className="free-ai-meta">
            {providerInfo.name}
            <span className="free-ai-meta-dot"> · </span>
            <span className="free-ai-meta-free">FREE</span>
            <span className="free-ai-meta-dot"> · </span>
            {providerInfo.privacy} privacy
          </span>
        </div>
        <button
          type="button"
          className={`free-ai-settings-btn${showGroqSettings ? ' active' : ''}`}
          onClick={() => setShowGroqSettings((s) => !s)}
          title="AI settings — add Groq key for faster responses"
          aria-label="AI settings"
        >
          ⚙
        </button>
      </div>

      {/* Groq settings panel */}
      {showGroqSettings && (
        <div className="free-ai-settings-panel">
          <div className="free-ai-settings-header">
            <strong>⚡ Use Groq for faster, smarter AI</strong>
            <span className="free-ai-settings-badge">Recommended</span>
          </div>
          <p className="free-ai-settings-desc">
            Groq runs Llama 3.1 for free — no credit card needed. Get your key at{' '}
            <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="free-ai-link">
              console.groq.com
            </a>{' '}
            in under 2 minutes.
          </p>
          <div className="free-ai-settings-row">
            <input
              type="password"
              className="free-ai-groq-input"
              placeholder="gsk_xxxxxxxxxxxxxxxxxxxx"
              value={groqKeyDraft}
              onChange={(e) => setGroqKeyDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveGroqKey()}
              autoComplete="off"
            />
            <button
              type="button"
              className="free-ai-groq-save"
              onClick={handleSaveGroqKey}
            >
              {groqKeySaved ? '✓ Saved!' : groqKeyDraft ? 'Save key' : 'Clear key'}
            </button>
          </div>
          {hasGroqKey() && (
            <p className="free-ai-settings-active">
              ✓ Groq key active — using Llama 3.1 (8B) for all responses
            </p>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="free-ai-messages" aria-live="polite" aria-label="Chat messages">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`free-ai-msg free-ai-msg--${msg.role}${msg.error ? ' free-ai-msg--error' : ''}`}
          >
            <div className="free-ai-msg-body">{renderMessageContent(msg.content)}</div>
            {msg.model && (
              <div className="free-ai-msg-model">{msg.model}</div>
            )}
          </div>
        ))}

        {loading && (
          <div className="free-ai-msg free-ai-msg--assistant">
            <div className="free-ai-thinking" aria-label="AI is thinking">
              <span /><span /><span />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick actions */}
      {showQuickActions && (
        <div className="free-ai-quick-actions">
          <p className="free-ai-quick-label">Quick questions:</p>
          <div className="free-ai-quick-btns">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action}
                type="button"
                className="free-ai-quick-btn"
                onClick={() => handleSubmit(null, action)}
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form className="free-ai-input-row" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask about your financing options…"
          disabled={loading}
          className="free-ai-input"
          aria-label="Ask a question"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(null);
            }
          }}
        />
        <button
          type="submit"
          disabled={!inputText.trim() || loading}
          className="free-ai-send-btn"
        >
          {loading ? '…' : '→'}
        </button>
      </form>

      <div className="free-ai-footer">
        <span>100% free</span>
        <span className="free-ai-footer-dot"> · </span>
        <span>{providerInfo.privacy} privacy</span>
        {!isGroq && (
          <>
            <span className="free-ai-footer-dot"> · </span>
            <button
              type="button"
              className="free-ai-footer-link"
              onClick={() => setShowGroqSettings(true)}
            >
              ⚡ Add Groq key for better responses
            </button>
          </>
        )}
        {isGroq && (
          <>
            <span className="free-ai-footer-dot"> · </span>
            <span>Llama 3.1 via Groq</span>
          </>
        )}
      </div>
    </div>
  );
}
