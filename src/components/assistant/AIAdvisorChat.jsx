import { useMemo, useRef, useState } from 'react';

const MODEL_ID = 'Xenova/LaMini-Flan-T5-77M';
const TRANSFORMERS_CDN_URL = 'https://esm.sh/@xenova/transformers@2.17.2?bundle';

const SYSTEM_PROMPT = [
  'You are FinSight AI Advisor.',
  'Use only the provided FinSight context data to answer.',
  'Be concise and practical.',
  'If data is missing, say exactly what is missing.',
  'Do not invent rates, costs, or lender terms.',
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
    timestamp: new Date().toISOString(),
    inputs: safe.inputs ?? {},
    rates: safe.rates ?? {},
    ratesStatus: safe.ratesStatus ?? 'unknown',
    viewState: safe.viewState ?? {},
    savedScenario: safe.savedScenario ?? null,
    results: results.map((r) => ({
      id: r.id,
      label: r.label,
      totalCost: r.totalCost,
      totalInterest: r.totalInterest,
      interestAmount: r.interestAmount,
      feeAmount: r.feeAmount,
      monthlyPayment: r.monthlyPayment,
      sac: r.sac,
      eac: r.eac,
      termMonths: r.termMonths,
      likelihood: r.likelihood,
      freeCashflowPct: r.freeCashflowPct,
      speedOrder: r.speedOrder,
      vsCheapest: r.vsCheapest,
      isCheapest: r.isCheapest,
      eligibilityWarnings: r.eligibilityWarnings ?? [],
      scheduleSummary: summarizeSchedule(r.schedule),
    })),
    chartData: results.map((r) => ({
      id: r.id,
      label: r.label,
      totalCost: r.totalCost,
      monthlyPayment: r.monthlyPayment,
      likelihood: r.likelihood,
      freeCashflowPct: r.freeCashflowPct,
      speedOrder: r.speedOrder,
    })),
    selectedProductDetail: selected ? {
      id: selected.id,
      label: selected.label,
      scheduleSummary: summarizeSchedule(selected.schedule),
      eligibilityWarnings: selected.eligibilityWarnings ?? [],
    } : null,
  };
}

function buildPrompt(context, question, turns) {
  const history = turns
    .slice(-6)
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n');

  return `${SYSTEM_PROMPT}

CONTEXT_JSON:
${JSON.stringify(context)}

RECENT_CHAT:
${history}

USER_QUESTION:
${question}

ANSWER:`;
}

export function AIAdvisorChat({ contextData }) {
  const modelRef = useRef(null);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'AI Advisor is ready. Ask me anything about your financing numbers, rankings, and tradeoffs.',
    },
  ]);
  const [draft, setDraft] = useState('');
  const [loadingModel, setLoadingModel] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [modelError, setModelError] = useState('');

  const context = useMemo(() => trimContext(contextData), [contextData]);

  async function ensureModel() {
    if (modelRef.current) return modelRef.current;
    setLoadingModel(true);
    setModelError('');
    try {
      const { pipeline, env } = await import(/* @vite-ignore */ TRANSFORMERS_CDN_URL);
      env.allowLocalModels = false;
      env.useBrowserCache = true;
      modelRef.current = await pipeline('text2text-generation', MODEL_ID);
      return modelRef.current;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load browser model.';
      setModelError(message);
      throw error;
    } finally {
      setLoadingModel(false);
    }
  }

  async function onAsk() {
    const question = draft.trim();
    if (!question || generating) return;
    setDraft('');

    const nextTurns = [...messages, { role: 'user', content: question }];
    setMessages(nextTurns);
    setGenerating(true);

    try {
      const model = await ensureModel();
      const prompt = buildPrompt(context, question, nextTurns);
      const output = await model(prompt, {
        max_new_tokens: 220,
        do_sample: false,
      });
      const answer = Array.isArray(output) ? output[0]?.generated_text : String(output ?? '');
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: (answer || 'I could not generate a response from the local model.').trim(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'I could not run the in-browser model. Check network/browser support and try again.',
        },
      ]);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="ai-advisor-card">
      <div className="ai-advisor-head">
        <h3>AI Advisor (In-Browser LLM)</h3>
        <p>No backend required. Uses your current FinSight numbers and charts context.</p>
      </div>

      <div className="ai-advisor-status">
        <span>Model: {modelRef.current ? 'loaded' : loadingModel ? 'loading…' : 'not loaded'}</span>
        {modelError && <span className="ai-advisor-error">Error: {modelError}</span>}
      </div>

      <div className="ai-advisor-messages" aria-live="polite">
        {messages.map((m, idx) => (
          <div key={`${m.role}-${idx}`} className={`ai-msg ai-msg--${m.role}`}>
            <div className="ai-msg-role">{m.role === 'assistant' ? 'Advisor' : 'You'}</div>
            <div className="ai-msg-body">{m.content}</div>
          </div>
        ))}
      </div>

      <div className="ai-advisor-input">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask about costs, cashflow burden, approvals, tradeoffs, or scenario impacts..."
          rows={3}
        />
        <button type="button" onClick={onAsk} disabled={generating || loadingModel || !draft.trim()}>
          {generating ? 'Thinking…' : 'Ask Advisor'}
        </button>
      </div>
    </div>
  );
}
