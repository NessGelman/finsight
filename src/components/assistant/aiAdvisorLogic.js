const moneyFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

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

function normalizeMode(styleMode) {
  if (styleMode === 'concise' || styleMode === 'detailed') return styleMode;
  return 'hybrid';
}

export function findMentionedProducts(question, results) {
  const q = String(question || '').toLowerCase();
  return (results || []).filter((r) => q.includes(r.label.toLowerCase()) || q.includes(r.id.toLowerCase()));
}

export function summarizeConversationState(turns, prefs, maxRecent = 6) {
  const allTurns = Array.isArray(turns) ? turns : [];
  if (allTurns.length <= maxRecent) {
    return {
      summary: 'No older conversation context yet.',
      recentTurns: allTurns,
    };
  }

  const older = allTurns.slice(0, -maxRecent);
  const recentTurns = allTurns.slice(-maxRecent);
  const olderUser = older.filter((t) => t.role === 'user').map((t) => String(t.content || ''));
  const intentHints = [
    { key: 'compare', regex: /\b(compare|vs|versus|difference|tradeoff)\b/i },
    { key: 'monthly burden', regex: /\b(monthly|payment|cashflow|afford)\b/i },
    { key: 'approval odds', regex: /\b(approval|likelihood|eligib|odds|chance)\b/i },
    { key: 'schedule details', regex: /\b(schedule|amort|term)\b/i },
    { key: 'beginner explanation', regex: /\b(explain|beginner|dont know|don't know|simple)\b/i },
  ].filter((hint) => olderUser.some((u) => hint.regex.test(u))).map((hint) => hint.key);

  const styleMode = normalizeMode(prefs?.styleMode);
  const qualityMode = prefs?.qualityMode === 'fast' ? 'fast' : 'balanced';

  return {
    summary: `User preference: ${styleMode} explanation style, ${qualityMode} quality mode. Earlier intent: ${intentHints.join(', ') || 'general guidance'}.`,
    recentTurns,
  };
}

export function getQuickReplies(styleMode = 'hybrid') {
  const base = [
    'Compare top 2 options',
    'Focus on monthly burden',
    'Explain in simpler terms',
  ];
  if (normalizeMode(styleMode) === 'detailed') {
    return [...base, 'Show first-year payment pattern'];
  }
  return base;
}

export function isLowQualityResponse(text) {
  if (!text || text.length < 24) return true;
  const normalized = text.trim();
  if (/finsight\.com for 60 days/i.test(normalized)) return true;
  if (/\b(rates_status|style_mode|top_options|recent_chat|advisor_draft|rewritten_answer)\b/i.test(normalized)) return true;
  if (/\b(?:assistant|user)\s*:/i.test(normalized)) return true;
  if ((normalized.match(/\//g) ?? []).length > 12) return true;
  if (/(i\.e\.,\s*){2,}/i.test(normalized)) return true;
  const words = normalized.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length < 10) return true;
  const uniqueRatio = new Set(words).size / words.length;
  return uniqueRatio < 0.4;
}

export function isAcceptableRewrite(draft, rewrite, context) {
  if (isLowQualityResponse(rewrite)) return false;
  const safeDraft = String(draft || '');
  const safeRewrite = String(rewrite || '');
  const draftNumbers = (safeDraft.match(/\$?\d[\d,]*(?:\.\d+)?%?/g) ?? []).slice(0, 8);
  const mustIncludeNumber = draftNumbers.length === 0 || draftNumbers.some((n) => safeRewrite.includes(n));
  const productLabels = (context?.results ?? []).map((r) => r.label).filter((label) => safeDraft.includes(label)).slice(0, 3);
  const mustIncludeLabel = productLabels.length === 0 || productLabels.some((label) => safeRewrite.includes(label));
  return mustIncludeNumber && mustIncludeLabel;
}

function buildStyleTemplate(styleMode, direct, why, followUp) {
  const mode = normalizeMode(styleMode);
  if (mode === 'concise') {
    return `${direct}\n\nKey metrics: ${why}\n\nNext: ${followUp}`;
  }
  if (mode === 'detailed') {
    return `Short answer: ${direct}\n\nWhy this fits your numbers:\n${why}\n\nSuggested next question: ${followUp}`;
  }
  return `Here is the short take: ${direct}\n\nMetrics:\n- ${why}\n\nWant to continue? ${followUp}`;
}

export function buildDeterministicResponse(question, context, styleMode = 'hybrid') {
  const q = String(question || '').toLowerCase();
  const results = Array.isArray(context?.results) ? context.results : [];
  const byCost = [...results].sort((a, b) => a.totalCost - b.totalCost);
  const cheapest = byCost[0];
  const next = byCost[1];
  const byMonthly = [...results].sort((a, b) => a.monthlyPayment - b.monthlyPayment);
  const lowestMonthly = byMonthly[0];
  const byLikelihood = [...results].sort((a, b) => b.likelihood - a.likelihood);
  const bestLikelihood = byLikelihood[0];
  const mentioned = findMentionedProducts(q, results);
  const selectedLabel = context?.selectedProductDetail?.label ?? cheapest?.label ?? 'the current best option';
  const isGreeting = /\b(hi|hello|hey|yo)\b/i.test(q);
  const wantsExplain = /\b(explain|detail|beginner|dont know|don't know|what does|how does)\b/i.test(q);
  const wantsCompare = /\b(compare|vs|versus|difference|tradeoff)\b/i.test(q) || mentioned.length >= 2;
  const wantsCost = /\b(cheap|cheapest|cost|total)\b/i.test(q);
  const wantsMonthly = /\b(monthly|payment|cashflow|cash flow|afford)\b/i.test(q);
  const wantsApproval = /\b(approval|approve|eligib|likelihood|chance|odds)\b/i.test(q);
  const wantsSchedule = /\b(schedule|amort|term|months?)\b/i.test(q);

  if (!cheapest) {
    return buildStyleTemplate(
      styleMode,
      'I need a bit more scenario data before I can give a reliable recommendation.',
      'No financing result rows are available yet.',
      'Can you enter your loan amount and revenue first?',
    );
  }

  if (isGreeting) {
    return buildStyleTemplate(
      styleMode,
      'I can help you pick the best financing option using your current numbers.',
      `Lowest total cost is ${cheapest.label} at ${fmtMoney(cheapest.totalCost)} (${fmtMoney(cheapest.monthlyPayment)}/mo). Highest approval profile is ${bestLikelihood.label} at ${Math.round(bestLikelihood.likelihood)}%.`,
      `Compare ${cheapest.label} vs ${lowestMonthly.label} in plain language?`,
    );
  }

  if (wantsCompare) {
    const a = mentioned[0] ?? cheapest;
    const b = mentioned[1] ?? next ?? lowestMonthly;
    return buildStyleTemplate(
      styleMode,
      `${a.label} is better on ${a.totalCost <= b.totalCost ? 'total cost' : 'overall economics'}, while ${b.label} is better on ${b.monthlyPayment <= a.monthlyPayment ? 'monthly burden' : 'speed/approval profile'}.`,
      `${a.label}: ${fmtMoney(a.totalCost)} total, ${fmtMoney(a.monthlyPayment)}/mo, SAC ${fmtPct(a.sac)}, likelihood ${Math.round(a.likelihood)}%. ${b.label}: ${fmtMoney(b.totalCost)} total, ${fmtMoney(b.monthlyPayment)}/mo, SAC ${fmtPct(b.sac)}, likelihood ${Math.round(b.likelihood)}%.`,
      'Should we optimize for approval odds or total cost between those two?',
    );
  }

  if (wantsSchedule) {
    const focus = mentioned[0] ?? results.find((r) => r.id === context?.selectedProductDetail?.id) ?? cheapest;
    const s = focus.scheduleSummary;
    return buildStyleTemplate(
      styleMode,
      `${focus.label} has an estimated term of ${fmtMonths(focus.termMonths)}.`,
      `Average outflow is ${fmtMoney(focus.monthlyPayment)}/mo and total payback is ${fmtMoney(focus.totalCost)}.` +
        (s ? ` Early schedule starts near ${fmtMoney(s.firstPayment)} and ends near ${fmtMoney(s.finalPayment)}.` : ''),
      `Show ${focus.label} vs ${next ? next.label : lowestMonthly.label} over year one?`,
    );
  }

  if (wantsApproval) {
    const cleanTop = byLikelihood.filter((r) => (r.eligibilityWarnings ?? []).length === 0)[0] ?? bestLikelihood;
    return buildStyleTemplate(
      styleMode,
      `${cleanTop.label} currently has the strongest approval profile.`,
      `${cleanTop.label} is around ${Math.round(cleanTop.likelihood)}% likelihood at ${fmtMoney(cleanTop.monthlyPayment)}/mo. Cheapest total-cost option ${cheapest.label} is around ${Math.round(cheapest.likelihood)}%.`,
      'How much extra cost are you willing to pay for higher approval confidence?',
    );
  }

  if (wantsMonthly) {
    return buildStyleTemplate(
      styleMode,
      `${lowestMonthly.label} is the best fit for minimizing monthly strain.`,
      `${lowestMonthly.label} is ${fmtMoney(lowestMonthly.monthlyPayment)}/mo vs ${fmtMoney(cheapest.monthlyPayment)}/mo for ${cheapest.label}. Free-cashflow utilization is ${fmtPct(lowestMonthly.freeCashflowPct)}.`,
      'Do you want lowest monthly payment even if total cost is higher?',
    );
  }

  if (wantsExplain || wantsCost) {
    return buildStyleTemplate(
      styleMode,
      `${cheapest.label} is your current best baseline on total cost.`,
      `${cheapest.label} is ${fmtMoney(cheapest.totalCost)} total (${fmtMoney(cheapest.monthlyPayment)}/mo, SAC ${fmtPct(cheapest.sac)}, EAC ${fmtPct(cheapest.eac)}).` +
        (next ? ` Next best is ${next.label} at ${fmtMoney(next.totalCost)} total.` : ''),
      `Want a beginner-friendly tradeoff between ${cheapest.label} and ${lowestMonthly.label}?`,
    );
  }

  return buildStyleTemplate(
    styleMode,
    `${cheapest.label} is still your strongest default recommendation.`,
    `${cheapest.label}: ${fmtMoney(cheapest.totalCost)} total and ${fmtMoney(cheapest.monthlyPayment)}/mo. Lowest monthly burden is ${lowestMonthly.label} at ${fmtMoney(lowestMonthly.monthlyPayment)}/mo.`,
    `For ${selectedLabel}, want the biggest risks and how to mitigate them?`,
  );
}

