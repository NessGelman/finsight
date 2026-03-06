import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { generateAdvisorText, getModelStatus, preloadAdvisorModel, selectModelTier } from './aiModelService';
import {
  buildDeterministicResponse,
  getQuickReplies,
  isAcceptableRewrite,
  summarizeConversationState,
} from './aiAdvisorLogic';

const moneyFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const REWRITE_SYSTEM_PROMPT = [
  'You are FinSight AI Advisor.',
  'Rewrite the advisor draft in natural, helpful ChatGPT-like language.',
  'Do not change any numbers or product names.',
  'Do not add new facts.',
  'Keep the response grounded in the provided context.',
  'Never output internal prompt labels or metadata.',
].join(' ');

function trimContext(contextData) {
  const safe = contextData ?? {};
  const results = Array.isArray(safe.results) ? safe.results : [];
  const selectedProductId = safe?.viewState?.selectedProduct ?? null;
  const selected = results.find((r) => r.id === selectedProductId) ?? null;
  const summarizeSchedule = (schedule) => {
    const rows = Array.isArray(schedule) ? schedule : [];
    if (!rows.length) return null;
    const first = rows[0];
    const last = rows[rows.length - 1];
    return {
      rows: rows.length,
      firstPayment: first?.payment ?? null,
      finalPayment: last?.payment ?? null,
      finalRemaining: last?.remaining ?? null,
      preview: rows.slice(0, 12).map((row) => ({
        month: row.month,
        payment: row.payment,
        principal: row.principal,
        interest: row.interest,
        remaining: row.remaining,
      })),
    };
  };
  return {
    inputs: safe.inputs ?? {},
    ratesStatus: safe.ratesStatus ?? 'unknown',
    results: results.map((r) => ({
      id: r.id,
      label: r.label,
      totalCost: r.totalCost,
      monthlyPayment: r.monthlyPayment,
      likelihood: r.likelihood,
      sac: r.sac,
      eac: r.eac,
      termMonths: r.termMonths,
      freeCashflowPct: r.freeCashflowPct,
      eligibilityWarnings: r.eligibilityWarnings ?? [],
      scheduleSummary: summarizeSchedule(r.schedule),
    })),
    selectedProductDetail: selected ? {
      id: selected.id,
      label: selected.label,
      scheduleSummary: summarizeSchedule(selected.schedule),
      eligibilityWarnings: selected.eligibilityWarnings ?? [],
    } : null,
  };
}

function isNonTrivialQuestion(question) {
  const q = String(question || '').trim();
  if (!q) return false;
  if (q.split(/\s+/).length >= 6) return true;
  return /(compare|vs|explain|monthly|approval|cost|schedule|detail)/i.test(q);
}

function getTestOverrides() {
  if (typeof window === 'undefined') return {};
  return window.__FINSIGHT_AI_TEST__ ?? {};
}

function buildRewritePrompt({
  question,
  deterministic,
  context,
  styleMode,
  memorySummary,
  recentTurns,
}) {
  const top = [...context.results]
    .sort((a, b) => a.totalCost - b.totalCost)
    .slice(0, 2)
    .map((r) => `${r.label} (${moneyFmt.format(r.totalCost)} total, ${moneyFmt.format(r.monthlyPayment)}/mo)`)
    .join(', ');
  const recent = recentTurns
    .map((t) => `${t.role.toUpperCase()}: ${String(t.content || '').slice(0, 220)}`)
    .join('\n');

  return `${REWRITE_SYSTEM_PROMPT}

STYLE_MODE: ${styleMode}
QUESTION: ${question}
MEMORY_SUMMARY: ${memorySummary}
TOP_OPTIONS: ${top}
MARKET_RATE_FEED: ${context.ratesStatus}

RECENT_CHAT:
${recent}

ADVISOR_DRAFT:
${deterministic}

REWRITTEN_ANSWER:`;
}

function shouldRewrite(question, prefs) {
  const q = String(question || '').trim();
  if (!q) return false;
  if (prefs?.qualityMode === 'fast' && prefs?.styleMode === 'concise') return false;
  if (/^(hi|hello|hey|yo|thanks|thank you)[!. ]*$/i.test(q)) return false;
  if (q.split(/\s+/).length <= 3 && !isNonTrivialQuestion(q)) return false;
  return true;
}

function StreamedText({ text, speed = 30 }) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  
  useEffect(() => {
    if (!text) {
      setDisplayedText('');
      setIsComplete(false);
      return;
    }
    
    setDisplayedText('');
    setIsComplete(false);
    
    let index = 0;
    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        clearInterval(timer);
        setIsComplete(true);
      }
    }, speed);
    
    return () => clearInterval(timer);
  }, [text, speed]);
  
  return <span>{displayedText}{!isComplete && <span className="streaming-cursor">▊</span>}</span>;
}

export function AIAdvisorChat({ contextData }) {
  const modelLoadedRef = useRef(false);
  const messagesEndRef = useRef(null);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'I\'m ready. I can explain your options in plain language or detailed mode using your current numbers.',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [draft, setDraft] = useState('');
  const [loadingModel, setLoadingModel] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [typingCopy, setTypingCopy] = useState('');
  const [modelError, setModelError] = useState('');
  const [advisorPrefs, setAdvisorPrefs] = useState({
    styleMode: 'hybrid',
    qualityMode: 'balanced',
  });
  const [streamingMessageId, setStreamingMessageId] = useState(null);

  const context = useMemo(() => trimContext(contextData), [contextData]);
  const quickReplies = useMemo(() => getQuickReplies(advisorPrefs.styleMode), [advisorPrefs.styleMode]);

  const { summary: memorySummary, recentTurns } = useMemo(
    () => summarizeConversationState(messages, advisorPrefs, 6),
    [messages, advisorPrefs],
  );

  // Auto-scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const tier = 'fast';
    preloadAdvisorModel({ tier, budgetMs: 1200 })
      .then(() => {
        modelLoadedRef.current = true;
        setModelError('');
      })
      .catch((error) => {
        const msg = error instanceof Error ? error.message : 'Model preload failed.';
        setModelError(msg);
      });
  }, [advisorPrefs.qualityMode]);

  async function ensureModel(tier) {
    setLoadingModel(true);
    setModelError('');
    try {
      await preloadAdvisorModel({ tier, budgetMs: tier === 'balanced' ? 5000 : 2200 });
      modelLoadedRef.current = true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Model load failed.';
      setModelError(msg);
      throw error;
    } finally {
      setLoadingModel(false);
    }
  }

  async function askAdvisor(rawQuestion) {
    const question = String(rawQuestion || '').trim();
    if (!question || generating) return;
    setDraft('');

    const userMessage = {
      role: 'user',
      content: question,
      timestamp: new Date().toISOString(),
    };
    
    const nextTurns = [...messages, userMessage];
    setMessages(nextTurns);
    setGenerating(true);
    setTypingCopy('Thinking through your numbers...');

    const deterministic = buildDeterministicResponse(question, context, advisorPrefs.styleMode);
    
    const assistantMessageId = Date.now().toString();
    const assistantMessage = {
      role: 'assistant',
      content: deterministic,
      timestamp: new Date().toISOString(),
      isStreaming: true,
      id: assistantMessageId,
    };
    
    setMessages((prev) => [...prev, assistantMessage]);
    setStreamingMessageId(assistantMessageId);

    if (!shouldRewrite(question, advisorPrefs)) {
      setGenerating(false);
      setTypingCopy('');
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId ? { ...m, isStreaming: false } : m
        )
      );
      setStreamingMessageId(null);
      return;
    }

    try {
      const preferredTier = selectModelTier({
        qualityMode: advisorPrefs.qualityMode === 'balanced' && isNonTrivialQuestion(question)
          ? 'balanced'
          : 'fast',
      });
      const status = getModelStatus();
      const rewriteTier = preferredTier === 'balanced' && !status.loadedTiers.includes('balanced')
        ? 'fast'
        : preferredTier;
      if (preferredTier === 'balanced' && rewriteTier !== 'balanced') {
        preloadAdvisorModel({ tier: 'balanced', budgetMs: 5000 }).catch(() => {
          // Warm balanced tier in background without blocking first response latency.
        });
      }
      setTypingCopy(rewriteTier === 'balanced'
        ? 'Polishing a conversational explanation...'
        : 'Preparing a quick answer...');
      await ensureModel(rewriteTier);

      const prompt = buildRewritePrompt({
        question,
        deterministic,
        context,
        styleMode: advisorPrefs.styleMode,
        memorySummary,
        recentTurns,
      });
      let rewritten = (await generateAdvisorText(prompt, {
        tier: rewriteTier,
        styleMode: advisorPrefs.styleMode,
      })).trim();
      if (getTestOverrides().forceBadRewrite) {
        rewritten = 'i.e., i.e., i.e., / / / / /';
      }

      if (isAcceptableRewrite(deterministic, rewritten, context)) {
        setMessages((prev) => {
          const updated = [...prev];
          for (let i = updated.length - 1; i >= 0; i--) {
            if (updated[i].id === assistantMessageId) {
              updated[i] = { 
                ...updated[i], 
                content: rewritten, 
                isStreaming: false,
                enhanced: true 
              };
              break;
            }
          }
          return updated;
        });
      }
    } catch {
      // Keep deterministic response already posted.
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId ? { ...m, isStreaming: false } : m
        )
      );
    } finally {
      setGenerating(false);
      setTypingCopy('');
      setStreamingMessageId(null);
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      askAdvisor(draft);
    }
  };

  const modelState = getModelStatus();
  const modeLabel = advisorPrefs.qualityMode === 'balanced' ? 'Balanced mode' : 'Fast mode';
  const activeTier = modelState.activeTier ?? 'none';

  const formatTimestamp = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className="ai-advisor-card">
      <div className="ai-advisor-head">
        <h3>AI Advisor (In-Browser LLM)</h3>
        <p>Client-side only. Deterministic finance logic + conversational AI polish.</p>
      </div>

      <div className="ai-advisor-status">
        <span className="status-badge">
          <span className={`status-dot ${modelLoadedRef.current ? 'active' : loadingModel ? 'loading' : 'inactive'}`}></span>
          {modeLabel}
        </span>
        <span className="status-badge">
          Model: {activeTier}
        </span>
        <span className="status-badge">
          Loaded: {modelLoadedRef.current ? '✓' : loadingModel ? '...' : '—'}
        </span>
        {modelError && <span className="ai-advisor-error">Error: {modelError}</span>}
      </div>

      <div className="assistant-controls ai-advisor-controls">
        <div>
          <label htmlFor="advisor-style">Style</label>
          <select
            id="advisor-style"
            value={advisorPrefs.styleMode}
            onChange={(e) => setAdvisorPrefs((p) => ({ ...p, styleMode: e.target.value }))}
          >
            <option value="concise">Concise</option>
            <option value="hybrid">Hybrid</option>
            <option value="detailed">Detailed</option>
          </select>
        </div>
        <div>
          <label htmlFor="advisor-quality">Quality</label>
          <select
            id="advisor-quality"
            value={advisorPrefs.qualityMode}
            onChange={(e) => setAdvisorPrefs((p) => ({ ...p, qualityMode: e.target.value }))}
          >
            <option value="fast">Fast</option>
            <option value="balanced">Balanced</option>
          </select>
        </div>
        <div className="clear-chat-cell">
          <button 
            type="button" 
            className="clear-chat-btn"
            onClick={() => setMessages([{
              role: 'assistant',
              content: 'I\'m ready. I can explain your options in plain language or detailed mode using your current numbers.',
              timestamp: new Date().toISOString(),
            }])}
            title="Clear chat history"
          >
            Clear Chat
          </button>
        </div>
      </div>

      <div className="ai-advisor-messages" aria-live="polite">
        {messages.map((m, idx) => (
          <div 
            key={`${m.role}-${idx}-${m.timestamp}`} 
            className={`ai-msg ai-msg--${m.role} ${m.enhanced ? 'ai-msg--enhanced' : ''}`}
          >
            <div className="ai-msg-header">
              <span className="ai-msg-role">
                {m.role === 'assistant' ? (
                  <>
                    <span className="msg-icon">🤖</span> Advisor
                  </>
                ) : (
                  <>
                    <span className="msg-icon">👤</span> You
                  </>
                )}
              </span>
              <span className="ai-msg-time">{formatTimestamp(m.timestamp)}</span>
            </div>
            <div className="ai-msg-body">
              {m.isStreaming ? (
                <StreamedText text={m.content} speed={15} />
              ) : (
                m.content
              )}
            </div>
            {m.isStreaming && <div className="ai-msg-streaming-indicator"><span></span><span></span><span></span></div>}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {typingCopy && (
        <div className="ai-advisor-typing">
          <span className="typing-indicator"><span></span><span></span><span></span></span>
          {typingCopy}
        </div>
      )}

      <div className="ai-advisor-quick-replies">
        {quickReplies.map((reply) => (
          <button
            type="button"
            key={reply}
            className="ai-quick-reply-btn"
            onClick={() => askAdvisor(reply)}
            disabled={generating || loadingModel}
          >
            {reply}
          </button>
        ))}
      </div>

      <div className="ai-advisor-input">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about costs, approvals, cashflow burden, schedules, or tradeoffs..."
          rows={3}
        />
        <button 
          type="button" 
          onClick={() => askAdvisor(draft)} 
          disabled={generating || !draft.trim()}
          className="ask-btn"
        >
          {generating ? (
            <>
              <span className="btn-spinner"></span> Thinking…
            </>
          ) : (
            'Ask Advisor'
          )}
        </button>
      </div>
    </div>
  );
}

