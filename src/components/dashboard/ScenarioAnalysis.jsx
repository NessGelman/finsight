import { useMemo, useState } from 'react';
import { calculateAllOptions } from '../../engine/financingCalculator';
import { FINANCING_TYPES } from '../../data/financingTypes';
import { formatCurrency, formatPercent } from '../../utils/formatters';

import { SPEED } from '../../data/speedData';

function isHardBlocked(result) {
  return result.eligibilityWarnings?.some((w) => /requires?/i.test(w));
}

// ─── Recommendation engine ────────────────────────────────────────────────────
function buildRecommendations(results) {
  const eligible = results.filter((r) => !isHardBlocked(r));
  if (!eligible.length) return { bestCost: null, bestSpeed: null, bestCashflow: null };

  const byTotalCost = [...eligible].sort((a, b) => a.totalCost - b.totalCost);
  const bestCost = byTotalCost[0];

  const fastEligible = eligible.filter((r) => SPEED[r.id]?.tier === 'fast');
  const bestSpeed = fastEligible.sort((a, b) => a.totalCost - b.totalCost)[0] ?? eligible[0];

  const bestCashflow = [...eligible].sort((a, b) => a.monthlyPayment - b.monthlyPayment)[0];

  return { bestCost, bestSpeed, bestCashflow };
}

// ─── Scenario generator ───────────────────────────────────────────────────────
function mergeTypes(raw) {
  return raw.map((r) => ({ ...FINANCING_TYPES[r.id], ...r }));
}

function generateScenarios(baseInputs, baseResults, liveRates) {
  const scenarios = [];
  const baseBest = baseResults.find((r) => r.isCheapest) ?? baseResults[0];
  if (!baseBest) return scenarios;

  // 1. Credit score boost (if not already excellent)
  if (baseInputs.creditScore < 800) {
    const newScore = Math.min(baseInputs.creditScore + 60, 800);
    const newRaw = calculateAllOptions({ ...baseInputs, creditScore: newScore }, liveRates);
    const newBest = newRaw.reduce((a, b) => (a.totalCost < b.totalCost ? a : b));
    scenarios.push({
      id: 'creditBoost',
      icon: '↑',
      iconColor: 'var(--accent-green)',
      title: 'Improve Your Credit Score',
      change: `${baseInputs.creditScore} → ${newScore} (+60 pts)`,
      savings: baseBest.totalCost - newBest.totalCost,
      monthlyDelta: baseBest.monthlyPayment - newBest.monthlyPayment,
      newBestId: newBest.id,
      bestChanged: baseBest.id !== newBest.id,
      newResults: mergeTypes(newRaw),
      tip: 'Reducing revolving credit utilization below 30% can raise your score 40–60 points in 3–6 months. Also dispute any errors on your credit report.',
    });
  }

  // 2. Borrow half the amount
  if (baseInputs.principal >= 20000) {
    const halfP = Math.round(baseInputs.principal / 2 / 5000) * 5000 || 5000;
    const newRaw = calculateAllOptions({ ...baseInputs, principal: halfP }, liveRates);
    const newBest = newRaw.reduce((a, b) => (a.totalCost < b.totalCost ? a : b));
    scenarios.push({
      id: 'halfAmount',
      icon: '½',
      iconColor: 'var(--accent-amber)',
      title: 'Borrow Less Capital',
      change: `${formatCurrency(baseInputs.principal)} → ${formatCurrency(halfP)}`,
      savings: baseBest.totalCost - newBest.totalCost,
      monthlyDelta: baseBest.monthlyPayment - newBest.monthlyPayment,
      newBestId: newBest.id,
      bestChanged: baseBest.id !== newBest.id,
      newResults: mergeTypes(newRaw),
      tip: 'Only borrow what you need now. Interest costs scale with principal. You can return for a second draw once you\'ve demonstrated repayment — often at better terms.',
    });
  }

  // 3. SBA eligibility (if currently blocked)
  const sbaCurrent = baseResults.find((r) => r.id === 'sba');
  if (sbaCurrent && isHardBlocked(sbaCurrent)) {
    const newAge = Math.max(baseInputs.businessAge, 2);
    const newScore = Math.max(baseInputs.creditScore, 640);
    const newRaw = calculateAllOptions({ ...baseInputs, businessAge: newAge, creditScore: newScore }, liveRates);
    const sbaResult = newRaw.find((r) => r.id === 'sba');
    const savings = baseBest.totalCost - sbaResult.totalCost;
    scenarios.push({
      id: 'sbaEligibility',
      icon: '★',
      iconColor: 'var(--accent-blue)',
      title: 'Qualify for SBA 7(a)',
      change: `${baseInputs.businessAge < 2 ? '2 yr in business' : ''}${baseInputs.creditScore < 640 ? ' · 640+ credit' : ''}`.trim().replace(/^·\s*/, ''),
      savings,
      monthlyDelta: baseBest.monthlyPayment - sbaResult.monthlyPayment,
      newBestId: 'sba',
      bestChanged: true,
      newResults: mergeTypes(newRaw),
      tip: 'SBA 7(a) requires 2+ years in business and a 640+ personal credit score for most lenders. It carries the lowest available rates and is worth timing your application around.',
    });
  }

  // 4. Revenue growth (+50%) — shows cashflow impact
  if (baseInputs.annualRevenue < 5_000_000) {
    const newRevenue = Math.round((baseInputs.annualRevenue * 1.5) / 10000) * 10000;
    const newRaw = calculateAllOptions({ ...baseInputs, annualRevenue: newRevenue }, liveRates);
    const currentBestInNew = newRaw.find((r) => r.id === baseBest.id);
    const fcfBefore = baseBest.freeCashflowPct;
    const fcfAfter = currentBestInNew?.freeCashflowPct ?? fcfBefore;
    scenarios.push({
      id: 'revenueGrowth',
      icon: '↗',
      iconColor: 'var(--accent-purple)',
      title: 'Grow Annual Revenue +50%',
      change: `${formatCurrency(baseInputs.annualRevenue)} → ${formatCurrency(newRevenue)}/yr`,
      savings: 0,
      fcfBefore,
      fcfAfter,
      monthlyDelta: 0,
      newBestId: baseBest.id,
      bestChanged: false,
      newResults: mergeTypes(newRaw),
      tip: 'Higher revenue reduces the cashflow burden of all financing products. It may also unlock better terms from lenders who underwrite based on revenue multiples.',
    });
  }

  return scenarios;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RecommendationCard({ bestCost, bestSpeed, bestCashflow }) {
  if (!bestCost) return null;
  const costAndSpeed = bestCost.id === bestSpeed?.id;

  return (
    <div className="recommendation-card">
      <div className="rec-header">
        <span className="rec-title">Personalized Recommendation</span>
        <span className="rec-subtitle">Based on your profile — eligible products only</span>
      </div>
      <div className="rec-grid">
        <RecItem
          label="Lowest Total Cost"
          icon="$"
          product={bestCost}
          detail={`${formatCurrency(bestCost.totalCost)} total · ${formatPercent(bestCost.sac)} SAC`}
          note={SPEED[bestCost.id]?.label ? `Funds in ${SPEED[bestCost.id].label}` : null}
          highlight
        />
        {!costAndSpeed && bestSpeed && (
          <RecItem
            label="Fastest to Fund"
            icon="⚡"
            product={bestSpeed}
            detail={`${SPEED[bestSpeed.id]?.label ?? '—'} · ${formatCurrency(bestSpeed.totalCost)} total`}
            note={`+${formatCurrency(bestSpeed.totalCost - bestCost.totalCost)} vs cheapest`}
          />
        )}
        {bestCashflow && bestCashflow.id !== bestCost.id && (
          <RecItem
            label="Lowest Monthly"
            icon="↓"
            product={bestCashflow}
            detail={`${formatCurrency(bestCashflow.monthlyPayment)}/mo · ${formatPercent(bestCashflow.freeCashflowPct)} FCF`}
            note={`${formatCurrency(bestCashflow.totalCost)} total cost`}
          />
        )}
      </div>
    </div>
  );
}

function RecItem({ label, icon, product, detail, note, highlight }) {
  return (
    <div className={`rec-item${highlight ? ' rec-item--highlight' : ''}`}>
      <div className="rec-item-icon" style={{ backgroundColor: product.color + '22', color: product.color }}>
        {icon}
      </div>
      <div className="rec-item-body">
        <div className="rec-item-label">{label}</div>
        <div className="rec-item-product">
          <span className="rec-product-dot" style={{ backgroundColor: product.color }} />
          {product.label}
        </div>
        <div className="rec-item-detail">{detail}</div>
        {note && <div className="rec-item-note">{note}</div>}
      </div>
    </div>
  );
}

function ScenarioCard({ scenario }) {
  const [expanded, setExpanded] = useState(false);
  const newBestType = FINANCING_TYPES[scenario.newBestId];

  const isFcfScenario = scenario.id === 'revenueGrowth';
  const hasSavings = !isFcfScenario && Math.abs(scenario.savings) >= 1;
  const savingsPositive = scenario.savings > 0;

  return (
    <div className="scenario-card">
      <div className="scenario-card-header">
        <div className="scenario-icon" style={{ color: scenario.iconColor }}>
          {scenario.icon}
        </div>
        <div className="scenario-card-meta">
          <div className="scenario-title">{scenario.title}</div>
          <div className="scenario-change">{scenario.change}</div>
        </div>

        <div className="scenario-outcome">
          {isFcfScenario ? (
            <>
              <div className="scenario-outcome-main" style={{ color: 'var(--accent-purple)' }}>
                FCF {formatPercent(scenario.fcfBefore)} → {formatPercent(scenario.fcfAfter)}
              </div>
              <div className="scenario-outcome-sub">cashflow burden drops</div>
            </>
          ) : hasSavings ? (
            <>
              <div
                className="scenario-outcome-main"
                style={{ color: savingsPositive ? 'var(--accent-green)' : 'var(--accent-red)' }}
              >
                {savingsPositive ? '−' : '+'}{formatCurrency(Math.abs(scenario.savings))}
              </div>
              <div className="scenario-outcome-sub">
                {savingsPositive ? 'total savings' : 'extra cost'}
              </div>
            </>
          ) : null}
        </div>

        <button
          className="scenario-expand-btn"
          onClick={() => setExpanded((e) => !e)}
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? '▲' : '▼'}
        </button>
      </div>

      {/* Best product change callout */}
      {scenario.bestChanged && newBestType && (
        <div className="scenario-best-changed">
          <span className="scenario-best-dot" style={{ backgroundColor: newBestType.color }} />
          Best product changes to <strong>{newBestType.label}</strong>
        </div>
      )}

      {/* Monthly delta */}
      {!isFcfScenario && Math.abs(scenario.monthlyDelta) >= 1 && (
        <div className="scenario-monthly-delta">
          Monthly payment {scenario.monthlyDelta > 0 ? '−' : '+'}{formatCurrency(Math.abs(scenario.monthlyDelta))}/mo
        </div>
      )}

      {/* Tip */}
      <div className="scenario-tip">💡 {scenario.tip}</div>

      {/* Expanded mini table */}
      {expanded && (
        <div className="scenario-expanded">
          <div className="scenario-table-label">Rankings in this scenario</div>
          <table className="scenario-mini-table">
            <thead>
              <tr>
                <th>Option</th>
                <th>Total Cost</th>
                <th>SAC</th>
                <th>Monthly</th>
              </tr>
            </thead>
            <tbody>
              {[...scenario.newResults]
                .sort((a, b) => a.totalCost - b.totalCost)
                .slice(0, 5)
                .map((r) => (
                  <tr key={r.id} className={r.id === scenario.newBestId ? 'scenario-row-best' : ''}>
                    <td>
                      <span className="scenario-row-dot" style={{ backgroundColor: r.color }} />
                      {r.label}
                    </td>
                    <td>{formatCurrency(r.totalCost)}</td>
                    <td>{formatPercent(r.sac)}</td>
                    <td>{formatCurrency(r.monthlyPayment)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SpeedGrid({ results }) {
  const tiers = {
    fast:   results.filter((r) => SPEED[r.id]?.tier === 'fast'),
    medium: results.filter((r) => SPEED[r.id]?.tier === 'medium'),
    slow:   results.filter((r) => SPEED[r.id]?.tier === 'slow'),
  };

  return (
    <div className="speed-grid-section">
      <div className="section-header">
        <span className="section-title">Speed to Fund</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Typical time from application to cash in hand</span>
      </div>
      <div className="speed-grid">
        {[
          { key: 'fast',   label: '⚡ Fast',     sub: '< 1 week',   color: 'var(--accent-green)' },
          { key: 'medium', label: '⏱ Medium',    sub: '1–2 weeks',  color: 'var(--accent-amber)' },
          { key: 'slow',   label: '🕐 Patient',  sub: '1–2 months', color: 'var(--accent-red)' },
        ].map(({ key, label, sub, color }) => (
          <div key={key} className="speed-tier">
            <div className="speed-tier-header" style={{ color }}>
              <span className="speed-tier-label">{label}</span>
              <span className="speed-tier-sub">{sub}</span>
            </div>
            <div className="speed-tier-items">
              {tiers[key].map((r) => (
                <div key={r.id} className="speed-item">
                  <span className="speed-item-dot" style={{ backgroundColor: r.color }} />
                  <span className="speed-item-name">{r.label}</span>
                  <span className="speed-item-time">{SPEED[r.id]?.label}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function ScenarioAnalysis({ baseInputs, baseResults, liveRates }) {
  const { bestCost, bestSpeed, bestCashflow } = useMemo(
    () => buildRecommendations(baseResults),
    [baseResults],
  );

  const scenarios = useMemo(
    () => generateScenarios(baseInputs, baseResults, liveRates),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [baseInputs.principal, baseInputs.annualRevenue, baseInputs.businessAge, baseInputs.creditScore,
     liveRates?.prime?.value, liveRates?.creditCard?.value],
  );

  return (
    <div className="scenario-analysis">
      {/* Recommendation engine */}
      <RecommendationCard bestCost={bestCost} bestSpeed={bestSpeed} bestCashflow={bestCashflow} />

      {/* Scenario cards */}
      <div className="scenario-section">
        <div className="section-header" style={{ marginBottom: 12 }}>
          <span className="section-title">What Changes Your Outcome?</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Each scenario shows the concrete dollar impact of one change
          </span>
        </div>
        <div className="scenario-cards">
          {scenarios.map((s) => (
            <ScenarioCard key={s.id} scenario={s} />
          ))}
        </div>
      </div>

      {/* Speed-to-fund grid */}
      <SpeedGrid results={baseResults} />
    </div>
  );
}
