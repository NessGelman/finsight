import { useMemo, useRef, useState } from 'react';
import { generateAdvisorText, preloadAdvisorModel } from './aiModelService';

const SYSTEM_PROMPT = [
  'You are FinSight AI Advisor.',
  'Use only the provided FinSight context data to answer.',
  'Be conversational, clear, and practical.',
  'Explain with concrete numbers from context.',
  'If data is missing, say exactly what is missing.',
  'Do not invent rates, costs, or lender terms.',
  'Use this output format:',
  '1) Direct answer',
  '2) Why (with numbers)',
  '3) Suggested next question',
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
  const byCost = [...context.results].sort((a, b) => a.totalCost - b.totalCost).slice(0, 3);
  const byMonthly = [...context.results].sort((a, b) => a.monthlyPayment - b.monthlyPayment).slice(0, 2);
  const byLikelihood = [...context.results].sort((a, b) => b.likelihood - a.likelihood).slice(0, 2);
  const history = turns
    .slice(-8)
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n');
  const contextSummary = [
    `Inputs: principal=${context.inputs.principal}, annualRevenue=${context.inputs.annualRevenue}, fixedExpenses=${context.inputs.fixedExpenses}, creditScore=${context.inputs.creditScore}, businessAge=${context.inputs.businessAge}`,
    `Top by total cost: ${byCost.map((r) => `${r.label} (${r.totalCost}, ${r.monthlyPayment}/mo, SAC ${r.sac}%)`).join(' | ')}`,
    `Top by monthly payment: ${byMonthly.map((r) => `${r.label} (${r.monthlyPayment}/mo)`).join(' | ')}`,
    `Top by approval likelihood: ${byLikelihood.map((r) => `${r.label} (${r.likelihood}%)`).join(' | ')}`,
    `Selected product detail: ${context.selectedProductDetail ? JSON.stringify(context.selectedProductDetail) : 'none'}`,
    `Rates status: ${context.ratesStatus}`,
  ].join('\n');

  return `${SYSTEM_PROMPT}

CONTEXT_SUMMARY:
${contextSummary}

RECENT_CHAT:
${history}

USER_QUESTION:
${question}

ANSWER:`;
}

function isLowQualityResponse(text) {
  if (!text || text.length < 20) return true;
  const normalized = text.trim();
  if (/finsight\.com for 60 days/i.test(normalized)) return true;
  if ((normalized.match(/\//g) ?? []).length > 14) return true;
  const words = normalized.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length < 8) return true;
  const uniqueRatio = new Set(words).size / words.length;
  return uniqueRatio < 0.35;
}

function fallbackResponse(question, context) {
  const byCost = [...context.results].sort((a, b) => a.totalCost - b.totalCost);
  const cheapest = byCost[0];
  const next = byCost[1];
  const byMonthly = [...context.results].sort((a, b) => a.monthlyPayment - b.monthlyPayment);
  const lowestMonthly = byMonthly[0];
  const hint = context.selectedProductDetail?.label ?? cheapest?.label;

  if (!cheapest) {
    return '1) Direct answer: I need more data first.\n2) Why (with numbers): No financing results are available yet.\n3) Suggested next question: "Can you compare options once I enter my inputs?"';
  }

  return [
    `1) Direct answer: Based on your current numbers, ${cheapest.label} is the strongest baseline choice for total cost.`,
    `2) Why (with numbers): ${cheapest.label} is about ${Math.round(cheapest.totalCost)} total (${Math.round(cheapest.monthlyPayment)}/mo, likelihood ${Math.round(cheapest.likelihood)}%).` +
      (next ? ` Next best is ${next.label} at about ${Math.round(next.totalCost)} total.` : '') +
      ` Lowest monthly burden is ${lowestMonthly.label} at about ${Math.round(lowestMonthly.monthlyPayment)}/mo.`,
    `3) Suggested next question: ${question ? `"For ${hint}, what are the biggest tradeoffs vs the next best option?"` : '"What is my best option if I care more about monthly cashflow than total cost?"'}`,
  ].join('\n');
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
    if (modelRef.current) return true;
    setLoadingModel(true);
    setModelError('');
    try {
      await preloadAdvisorModel();
      modelRef.current = true;
      return true;
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
      await ensureModel();
      const prompt = buildPrompt(context, question, nextTurns);
      const answer = (await generateAdvisorText(prompt)).trim();
      const safeAnswer = isLowQualityResponse(answer) ? fallbackResponse(question, context) : answer;
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: safeAnswer || fallbackResponse(question, context),
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
