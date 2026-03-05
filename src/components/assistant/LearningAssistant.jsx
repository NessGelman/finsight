import { useMemo, useState } from 'react';
import { formatCurrency, formatPercent } from '../../utils/formatters';

const PDF_DOC_KNOWLEDGE = {
  beginner: {
    short: [
      'Total cost is the extra dollars paid on top of principal.',
      'SAC/EAC annualizes financing cost so options are comparable.',
      'Free cashflow is the monthly buffer after fixed costs.',
    ],
    long: [
      'MCA is usually expensive but funds quickly.',
      'Invoice factoring is fast liquidity but can pressure margins.',
      'SBA and term loans are slower but often lower cost.',
      'High monthly burden can strain day-to-day operations.',
    ],
  },
  intermediate: {
    short: [
      'Compare options on total cost first, then normalize with SAC/EAC.',
      'Use burden ratio to check affordability, not just qualification.',
      'Fast funding products usually trade speed for higher cost.',
    ],
    long: [
      'Credit profile and time in business materially shift rate outcomes.',
      'Invoice factoring cost compounds with time outstanding.',
      'Revenue-based financing smooths payments but can lock in a high cap.',
      'APR-like annualized metrics make unlike products comparable.',
    ],
  },
  advanced: {
    short: [
      'Annualized cost can be approximated by SAC/EAC style normalization.',
      'Outflow stress test should anchor to free-cashflow utilization.',
      'Screen for structural risk before optimizing pure cost.',
    ],
    long: [
      'Cheapest nominal cost can still underperform on volatility-adjusted burden.',
      'Fee-heavy structures can hide cost despite simple repayment narratives.',
      'Term compression is a major driver of annualized cost acceleration.',
      'Use scenario deltas to rank resilience under revenue drawdowns.',
    ],
  },
};

const FOCUS_HEADLINES = {
  overview: 'Overall financing guidance',
  costs: 'Cost and pricing guidance',
  cashflow: 'Cashflow and affordability guidance',
  risk: 'Risk and structure guidance',
  options: 'Option-by-option guidance',
};

function pickTopOptions(results, focus) {
  if (!results.length) return [];

  if (focus === 'cashflow') {
    return [...results].sort((a, b) => a.monthlyPayment - b.monthlyPayment).slice(0, 3);
  }

  if (focus === 'risk') {
    const burden = (val) => (Number.isFinite(val) ? val : Number.POSITIVE_INFINITY);
    return [...results]
      .sort((a, b) => burden(a.freeCashflowPct) - burden(b.freeCashflowPct) || a.totalCost - b.totalCost)
      .slice(0, 3);
  }

  return [...results].sort((a, b) => a.totalCost - b.totalCost).slice(0, 3);
}

function staticInsights(fluency, time) {
  const level = PDF_DOC_KNOWLEDGE[fluency] ?? PDF_DOC_KNOWLEDGE.beginner;
  return time === 'short' ? level.short : level.long;
}

export function LearningAssistant({ results, inputs }) {
  const [fluency, setFluency] = useState('beginner');
  const [time, setTime] = useState('short');
  const [focus, setFocus] = useState('overview');

  const guidance = useMemo(() => {
    const topOptions = pickTopOptions(results, focus);
    const cheapest = results.length
      ? results.reduce((best, current) => (current.totalCost < best.totalCost ? current : best), results[0])
      : null;

    const scenario = `${formatCurrency(inputs.principal)} principal, ${formatCurrency(inputs.annualRevenue)} annual revenue, credit score ${inputs.creditScore}.`;

    const dynamicBullets = topOptions.map((opt) => {
      const burden = Number.isFinite(opt.freeCashflowPct) ? `, burden ${formatPercent(opt.freeCashflowPct, 1)}` : '';
      return `${opt.label}: total ${formatCurrency(opt.totalCost)}, SAC ${formatPercent(opt.sac, 1)}${burden}.`;
    });

    const recommendation = cheapest
      ? `Current lowest total estimated cost is ${cheapest.label} at ${formatCurrency(cheapest.totalCost)}.`
      : 'Enter financing inputs to generate live recommendation details.';

    return {
      headline: FOCUS_HEADLINES[focus],
      scenario,
      recommendation,
      dynamicBullets,
      staticBullets: staticInsights(fluency, time),
    };
  }, [results, inputs, fluency, time, focus]);

  return (
    <div className="assistant-card">
      <div className="assistant-head">
        <h3>Learning Assistant</h3>
        <p>Contextual guidance generated from your live FinSight scenario.</p>
      </div>

      <div className="assistant-controls">
        <div>
          <label htmlFor="assistant-fluency">Fluency</label>
          <select id="assistant-fluency" value={fluency} onChange={(e) => setFluency(e.target.value)}>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>

        <div>
          <label htmlFor="assistant-time">Time</label>
          <select id="assistant-time" value={time} onChange={(e) => setTime(e.target.value)}>
            <option value="short">Short</option>
            <option value="long">Long</option>
          </select>
        </div>

        <div>
          <label htmlFor="assistant-focus">Focus</label>
          <select id="assistant-focus" value={focus} onChange={(e) => setFocus(e.target.value)}>
            <option value="overview">Overview</option>
            <option value="costs">Costs</option>
            <option value="cashflow">Cashflow</option>
            <option value="risk">Risk</option>
            <option value="options">Options</option>
          </select>
        </div>
      </div>

      <div className="assistant-body">
        <h4>{guidance.headline}</h4>
        <p>{guidance.scenario}</p>
        <p>{guidance.recommendation}</p>

        <h5>Live snapshot</h5>
        <ul>
          {guidance.dynamicBullets.length ? (
            guidance.dynamicBullets.map((item) => <li key={item}>{item}</li>)
          ) : (
            <li>No option data yet. Update inputs in the top panel to see recommendations.</li>
          )}
        </ul>

        <h5>Explanation layer</h5>
        <ul>
          {guidance.staticBullets.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
