import { useState, useRef, useEffect } from 'react';
import { initAI, askAI, getAIProviderInfo } from '../../services/freeAIService';

const QUICK_ACTIONS = [
  "What's the cheapest option overall?",
  "Which has the lowest monthly payment?",
  "What are the risks of an MCA?",
  "Which option is best for cash flow?",
  "Explain the SBA loan in simple terms",
];

export function FreeAIChat({ results, inputs, rates }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiProvider, setAiProvider] = useState(null);
  const [initError, setInitError] = useState(null);

  const messagesEndRef = useRef(null);

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
            content: `Hi! I'm your FinSight advisor powered by ${info.name}. I've analyzed your financing options — what would you like to know?`,
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
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Sorry, I hit an error: ${err.message}. Try rephrasing your question.`,
          timestamp: Date.now(),
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (initError) {
    return (
      <div className="free-ai-chat free-ai-chat--error">
        <p>AI Advisor unavailable: {initError}</p>
        <p className="free-ai-note">Try Chrome 127+ for the best experience.</p>
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

  return (
    <div className="free-ai-chat">
      <div className="free-ai-header">
        <div className="free-ai-avatar">AI</div>
        <div className="free-ai-header-text">
          <strong>AI Financing Advisor</strong>
          <span className="free-ai-meta">
            {providerInfo.name} &middot; {providerInfo.cost} &middot; {providerInfo.privacy} privacy
          </span>
        </div>
      </div>

      <div className="free-ai-messages" aria-live="polite">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`free-ai-msg free-ai-msg--${msg.role}${msg.error ? ' free-ai-msg--error' : ''}`}
          >
            <div className="free-ai-msg-body">{msg.content}</div>
            {msg.model && (
              <div className="free-ai-msg-model">{msg.model}</div>
            )}
          </div>
        ))}

        {loading && (
          <div className="free-ai-msg free-ai-msg--assistant">
            <div className="free-ai-thinking">
              <span /><span /><span />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

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

      <form className="free-ai-input-row" onSubmit={handleSubmit}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask about your financing options…"
          disabled={loading}
          className="free-ai-input"
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
          Send
        </button>
      </form>

      <p className="free-ai-footer">
        100% free &middot; {providerInfo.privacy} privacy &middot; no API keys needed
      </p>
    </div>
  );
}
