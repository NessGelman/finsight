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

function isHardBlocked(result) {
  return result.eligibilityWarnings?.some((w) => /requires?/i.test(w));
}

function pickTopOptions(results, focus) {
  if (!results || !results.length) return [];

  const sorter = (a, b) => {
    // 1. Eligibility: Push hard-blocked options to the bottom
    const aBlocked = isHardBlocked(a);
    const bBlocked = isHardBlocked(b);
    if (aBlocked !== bBlocked) return aBlocked ? 1 : -1;

    // 2. Focus metric
    if (focus === 'cashflow') {
      return a.monthlyPayment - b.monthlyPayment;
    }
    if (focus === 'risk') {
      // Lower burden is better. Handle NaN (infinite burden) by treating as Infinity.
      const burdenA = Number.isFinite(a.freeCashflowPct) ? a.freeCashflowPct : Infinity;
      const burdenB = Number.isFinite(b.freeCashflowPct) ? b.freeCashflowPct : Infinity;
      if (Math.abs(burdenA - burdenB) > 0.1) return burdenA - burdenB;
      // Tie-break: Higher likelihood is better
      return b.likelihood - a.likelihood;
    }
    // Default: Total Cost
    return a.totalCost - b.totalCost;
  };

  return [...results].sort(sorter).slice(0, 3);
}

function staticInsights(fluency, time) {
  const level = PDF_DOC_KNOWLEDGE[fluency] ?? PDF_DOC_KNOWLEDGE.beginner;
  return time === 'short' ? level.short : level.long;
}

export function LearningAssistant({ results = [], inputs = {} }) {
  const [fluency, setFluency] = useState('beginner');
  const [time, setTime] = useState('short');
  const [focus, setFocus] = useState('overview');

  const guidance = useMemo(() => {
    const safeInputs = {
      principal: inputs?.principal ?? 0,
      annualRevenue: inputs?.annualRevenue ?? 0,
      creditScore: inputs?.creditScore ?? 0,
    };

    const topOptions = pickTopOptions(results, focus);
    
    const sortedByCost = [...results].sort((a, b) => a.totalCost - b.totalCost);
    const cheapest = sortedByCost[0];
    const bestEligible = sortedByCost.find((r) => !isHardBlocked(r));

    const scenario = `${formatCurrency(safeInputs.principal)} principal, ${formatCurrency(safeInputs.annualRevenue)} annual revenue, credit score ${safeInputs.creditScore}.`;

    const dynamicBullets = topOptions.map((opt) => {
      const burden = Number.isFinite(opt.freeCashflowPct) ? `, burden ${formatPercent(opt.freeCashflowPct, 1)}` : ', high burden';
      const blocked = isHardBlocked(opt) ? ' (May not qualify)' : '';
      return `${opt.label}: total ${formatCurrency(opt.totalCost)}, SAC ${formatPercent(opt.sac, 1)}${burden}${blocked}.`;
    });

    let recommendation = 'Enter financing inputs to generate live recommendation details.';
    if (results.length > 0) {
      if (bestEligible) {
        recommendation = `Best eligible option is ${bestEligible.label} at ${formatCurrency(bestEligible.totalCost)}.${cheapest && cheapest.id !== bestEligible.id ? ` ${cheapest.label} is cheaper but may require better qualifications.` : ''}`;
      } else if (cheapest) {
        recommendation = `Lowest cost is ${cheapest.label} (${formatCurrency(cheapest.totalCost)}), but you have eligibility warnings on all options.`;
      }
    }

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
