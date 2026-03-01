import { useMemo } from 'react';
import { formatCurrency, formatPercent } from '../../utils/formatters';

export function SummaryBar({ results, selectedProduct }) {
  const summary = useMemo(() => {
    if (!results || results.length === 0) return null;

    const eligible = results.filter(
      (r) => !r.eligibilityWarnings?.some((w) => /requires?/i.test(w)),
    );
    const pool = eligible.length ? eligible : results;
    const best = [...pool].sort((a, b) => a.totalCost - b.totalCost)[0];

    const costs = pool.map((r) => r.totalCost);
    const min = Math.min(...costs);
    const max = Math.max(...costs);

    // Savings callout: difference between worst and best eligible
    const worst = [...pool].sort((a, b) => b.totalCost - a.totalCost)[0];
    const savings = worst && best ? worst.totalCost - best.totalCost : 0;

    return { best, min, max, savings, worst };
  }, [results]);

  // If a product is selected, show that instead of "best"
  const selected = useMemo(() => {
    if (!selectedProduct || !results) return null;
    return results.find((r) => r.id === selectedProduct) || null;
  }, [selectedProduct, results]);

  if (!summary) return null;

  const display = selected || summary.best;
  const isSelected = !!selected;

  return (
    <div className="card-best" style={{ marginBottom: '16px' }}>
      <div style={{ minWidth: 0 }}>
        <div className="best-eyebrow">{isSelected ? 'Selected Option' : 'Best Option'}</div>
        <div className="best-name">{display.label}</div>
        <div className="best-metrics">
          Cost: <strong>{formatCurrency(display.totalCost)}</strong> · EAC: <strong>{formatPercent(display.sac)}</strong>
          {display.burdenRatio != null && (
            <> · <strong>{formatPercent(display.burdenRatio)}</strong> of free cashflow</>
          )}
        </div>

        {/* Only show savings callout if we are looking at the Best option and there's a spread */}
        {!isSelected && summary.savings > 0 && (
          <div className="best-savings">
            Saves ~{formatCurrency(summary.savings)} vs highest-cost option.
          </div>
        )}
      </div>

      {!isSelected && (
        <div className="best-badge">Best estimated cost</div>
      )}
    </div>
  );
}
