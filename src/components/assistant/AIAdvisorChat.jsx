import { useMemo, useRef, useState } from 'react';
import { generateAdvisorText, preloadAdvisorModel } from './aiModelService';

const ENABLE_MODEL_REWRITE = true;
const moneyFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const SYSTEM_PROMPT = [
  'You are FinSight AI Advisor.',
  'Rewrite the advisor draft in natural, friendly language.',
  'Do not change any product names or numbers.',
  'Do not add new facts.',
  'Keep structure and meaning.',
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
  const byCost = [...context.results].sort((a, b) => a.totalCost - b.totalCost).slice(0, 2);
  const history = turns
    .slice(-4)
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n');
  const contextSummary = `Top options now: ${byCost.map((r) => `${r.label} (${moneyFmt.format(r.totalCost)} total)`).join(', ')}`;

  return `${SYSTEM_PROMPT}

QUESTION:
${question}

CONTEXT:
${contextSummary}

RECENT_CHAT:
${history}

ADVISOR_DRAFT:
${turns[turns.length - 1]?.content ?? ''}

REWRITTEN_ANSWER:`;
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

function fmtMoney(val) {
  return Number.isFinite(val) ? moneyFmt.format(val) : '—';
}

function fmtPct(val) {
  return Number.isFinite(val) ? `${val.toFixed(1)}%` : '—';
}

function fmtMonths(val) {
  if (!Number.isFinite(val)) return '—';
  if (val < 12) return `${val} months`;
  const years = val / 12;
  return Number.isInteger(years) ? `${years} years` : `${years.toFixed(1)} years`;
}

function findMentionedProducts(question, results) {
  const q = question.toLowerCase();
  return results.filter((r) => q.includes(r.label.toLowerCase()) || q.includes(r.id.toLowerCase()));
}

function buildDeterministicResponse(question, context) {
  const q = question.toLowerCase();
  const byCost = [...context.results].sort((a, b) => a.totalCost - b.totalCost);
  const cheapest = byCost[0];
  const next = byCost[1];
  const byMonthly = [...context.results].sort((a, b) => a.monthlyPayment - b.monthlyPayment);
  const lowestMonthly = byMonthly[0];
  const byLikelihood = [...context.results].sort((a, b) => b.likelihood - a.likelihood);
  const bestLikelihood = byLikelihood[0];
  const mentioned = findMentionedProducts(question, context.results);
  const selectedLabel = context.selectedProductDetail?.label ?? cheapest?.label ?? 'the current best option';
  const isGreeting = /\b(hi|hello|hey|yo)\b/i.test(q);
  const wantsExplain = /\b(explain|detail|beginner|dont know|don't know|what does|how does)\b/i.test(q);
  const wantsCompare = /\b(compare|vs|versus|difference|tradeoff)\b/i.test(q) || mentioned.length >= 2;
  const wantsCost = /\b(cheap|cheapest|cost|total)\b/i.test(q);
  const wantsMonthly = /\b(monthly|payment|cashflow|cash flow|afford)\b/i.test(q);
  const wantsApproval = /\b(approval|approve|eligib|likelihood|chance|odds)\b/i.test(q);
  const wantsSchedule = /\b(schedule|amort|term|months?)\b/i.test(q);

  if (!cheapest) {
    return '1) Direct answer: I need more data first.\n2) Why (with numbers): No financing results are available yet.\n3) Suggested next question: "Can you compare options once I enter my inputs?"';
  }

  if (isGreeting) {
    return [
      `1) Direct answer: I can help you decide between financing options using your current numbers.`,
      `2) Why (with numbers): Right now your lowest total cost option is ${cheapest.label} at ${fmtMoney(cheapest.totalCost)} (${fmtMoney(cheapest.monthlyPayment)}/mo).` +
        ` The highest approval likelihood is ${bestLikelihood.label} at ${Math.round(bestLikelihood.likelihood)}%.`,
      `3) Suggested next question: "Compare ${cheapest.label} vs ${lowestMonthly.label} for me in beginner-friendly terms."`,
    ].join('\n');
  }

  if (wantsCompare) {
    const a = mentioned[0] ?? cheapest;
    const b = mentioned[1] ?? next ?? lowestMonthly;
    return [
      `1) Direct answer: ${a.label} is better for${a.totalCost <= b.totalCost ? ' total cost' : ' other factors'}, while ${b.label} may be better for${b.monthlyPayment <= a.monthlyPayment ? ' monthly burden' : ' speed or approval profile'}.`,
      `2) Why (with numbers): ${a.label}: ${fmtMoney(a.totalCost)} total, ${fmtMoney(a.monthlyPayment)}/mo, SAC ${fmtPct(a.sac)}, likelihood ${Math.round(a.likelihood)}%.` +
        ` ${b.label}: ${fmtMoney(b.totalCost)} total, ${fmtMoney(b.monthlyPayment)}/mo, SAC ${fmtPct(b.sac)}, likelihood ${Math.round(b.likelihood)}%.`,
      `3) Suggested next question: "If I prioritize approval odds, which of those two should I choose?"`,
    ].join('\n');
  }

  if (wantsSchedule) {
    const focus = mentioned[0] ?? context.results.find((r) => r.id === context.selectedProductDetail?.id) ?? cheapest;
    const s = focus.scheduleSummary;
    return [
      `1) Direct answer: ${focus.label} has an estimated term of ${fmtMonths(focus.termMonths)}.`,
      `2) Why (with numbers): Average monthly outflow is about ${fmtMoney(focus.monthlyPayment)}. Total payback is ${fmtMoney(focus.totalCost)}.` +
        (s ? ` Early schedule starts near ${fmtMoney(s.firstPayment)} and ends near ${fmtMoney(s.finalPayment)}.` : ''),
      `3) Suggested next question: "Show me how ${focus.label} compares to ${next ? next.label : lowestMonthly.label} over the first year."`,
    ].join('\n');
  }

  if (wantsApproval) {
    const cleanTop = byLikelihood.filter((r) => (r.eligibilityWarnings ?? []).length === 0)[0] ?? bestLikelihood;
    return [
      `1) Direct answer: ${cleanTop.label} currently gives you the strongest approval profile.`,
      `2) Why (with numbers): ${cleanTop.label} is at about ${Math.round(cleanTop.likelihood)}% likelihood with monthly payment around ${fmtMoney(cleanTop.monthlyPayment)}.` +
        ` Your top-cost choice (${cheapest.label}) sits around ${Math.round(cheapest.likelihood)}%.`,
      `3) Suggested next question: "How much extra total cost do I pay if I optimize for approval instead of cheapest cost?"`,
    ].join('\n');
  }

  if (wantsMonthly) {
    return [
      `1) Direct answer: ${lowestMonthly.label} is your best fit for minimizing monthly strain.`,
      `2) Why (with numbers): It is about ${fmtMoney(lowestMonthly.monthlyPayment)}/mo, versus ${fmtMoney(cheapest.monthlyPayment)}/mo for ${cheapest.label}.` +
        ` Its free-cashflow utilization is ${fmtPct(lowestMonthly.freeCashflowPct)}.`,
      `3) Suggested next question: "How much more total cost do I pay for the lower monthly payment?"`,
    ].join('\n');
  }

  if (wantsExplain || wantsCost) {
    return [
      `1) Direct answer: ${cheapest.label} is your current best baseline on total cost.`,
      `2) Why (with numbers): ${cheapest.label} is about ${fmtMoney(cheapest.totalCost)} total (${fmtMoney(cheapest.monthlyPayment)}/mo, SAC ${fmtPct(cheapest.sac)}, EAC ${fmtPct(cheapest.eac)}).` +
        (next ? ` Next best is ${next.label} at ${fmtMoney(next.totalCost)} total.` : ''),
      `3) Suggested next question: "Explain the tradeoff between ${cheapest.label} and ${lowestMonthly.label} like I’m new to financing."`,
    ].join('\n');
  }

  return [
    `1) Direct answer: ${cheapest.label} is still your strongest default recommendation.`,
    `2) Why (with numbers): ${cheapest.label} is ${fmtMoney(cheapest.totalCost)} total and ${fmtMoney(cheapest.monthlyPayment)}/mo. ${lowestMonthly.label} has the lightest monthly burden at ${fmtMoney(lowestMonthly.monthlyPayment)}/mo.`,
    `3) Suggested next question: "For ${selectedLabel}, what are the main risks and how can I mitigate them?"`,
  ].join('\n');
}

function isAcceptableRewrite(draft, rewrite, context) {
  if (isLowQualityResponse(rewrite)) return false;
  const draftNumbers = (draft.match(/\$?\d[\d,]*(?:\.\d+)?%?/g) ?? []).slice(0, 6);
  const requiredLabels = context.results.slice(0, 3).map((r) => r.label).filter((label) => draft.includes(label));
  const hasNumbers = draftNumbers.length === 0 || draftNumbers.some((n) => rewrite.includes(n));
  const hasLabel = requiredLabels.length === 0 || requiredLabels.some((label) => rewrite.includes(label));
  return hasNumbers && hasLabel;
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
      const deterministic = buildDeterministicResponse(question, context);
      let safeAnswer = deterministic;

      if (ENABLE_MODEL_REWRITE) {
        await ensureModel();
        const rewriteTurns = [...nextTurns, { role: 'assistant', content: deterministic }];
        const prompt = buildPrompt(context, question, rewriteTurns);
        const rewritten = (await generateAdvisorText(prompt)).trim();
        if (isAcceptableRewrite(deterministic, rewritten, context)) {
          safeAnswer = rewritten;
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: safeAnswer || deterministic,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: buildDeterministicResponse(question, context),
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
