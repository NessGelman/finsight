import { useMemo } from 'react';
import { SPEED } from '../../data/speedData';
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
  const speed = SPEED[display.id]?.label;
  const isSelected = !!selected;

  return (
    <div className={`summary-bar${isSelected ? ' summary-bar--selected' : ''}`}>
      <span className="summary-star">{isSelected ? '◉' : '★'}</span>
      <span className="summary-best-label">{isSelected ? 'Selected:' : 'Best:'}</span>
      <span className="summary-dot" style={{ backgroundColor: display.color }} />
      <span className="summary-best-label">{display.label}</span>
      <span className="summary-sep">·</span>
      <span className="summary-detail">{formatCurrency(display.totalCost)} total</span>
      <span className="summary-sep">·</span>
      <span className="summary-detail">{formatPercent(display.sac)} SAC</span>
      <span className="summary-sep">·</span>
      <span className="summary-detail">{formatCurrency(display.monthlyPayment)}/mo</span>
      {speed && (
        <>
          <span className="summary-sep">·</span>
          <span className="summary-detail">{speed}</span>
        </>
      )}

      {/* Savings callout or spread */}
      {!isSelected && summary.savings > 0 ? (
        <span className="summary-spread">
          Save {formatCurrency(summary.savings)} vs {summary.worst.shortLabel}
        </span>
      ) : (
        <span className="summary-spread">
          Spread: {formatCurrency(summary.min)} – {formatCurrency(summary.max)}
        </span>
      )}
    </div>
  );
}
