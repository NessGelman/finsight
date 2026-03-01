import { useState, useMemo } from 'react';
import { reverseAmortize, buildBaseParams } from '../../engine/financingCalculator';
import { FINANCING_TYPES } from '../../data/financingTypes';
import { formatCurrency } from '../../utils/formatters';

const AFFORDABILITY_PRODUCTS = [
  'sba',
  'equipmentFinancing',
  'termLoan',
  'lineOfCredit',
  'creditCard',
];

export function AffordabilityTool({ liveRates }) {
  const [targetMonthly, setTargetMonthly] = useState(3000);

  const affordability = useMemo(() => {
    const base = buildBaseParams(liveRates);

    return AFFORDABILITY_PRODUCTS.map((id) => {
      const params = base[id];
      if (!params) return null;

      let maxPrincipal;
      if (params.apr !== undefined) {
        maxPrincipal = reverseAmortize(targetMonthly, params.apr, params.termMonths);
      } else {
        // MCA / factoring — not amortized, skip
        return null;
      }

      return {
        id,
        label: FINANCING_TYPES[id]?.label ?? id,
        shortLabel: FINANCING_TYPES[id]?.shortLabel ?? id,
        color: FINANCING_TYPES[id]?.color ?? '#6b7280',
        maxPrincipal: Math.max(0, maxPrincipal),
        apr: params.apr,
        termMonths: params.termMonths,
      };
    })
      .filter(Boolean)
      .sort((a, b) => b.maxPrincipal - a.maxPrincipal);
  }, [targetMonthly, liveRates]);

  return (
    <div className="affordability-tool">
      <div className="affordability-header">
        <span className="section-title">Affordability</span>
        <span className="affordability-prompt">
          What can I borrow at
          <span className="affordability-input-wrap">
            <span className="affordability-dollar">$</span>
            <input
              type="number"
              className="affordability-input"
              value={targetMonthly}
              min={100}
              max={100000}
              step={100}
              onChange={(e) => setTargetMonthly(Math.max(100, Number(e.target.value) || 100))}
            />
          </span>
          /mo?
        </span>
      </div>

      <div className="affordability-results">
        {affordability.map((item) => (
          <div key={item.id} className="affordability-row">
            <span className="affordability-dot" style={{ background: item.color }} />
            <span className="affordability-product">{item.shortLabel}</span>
            <span className="affordability-bar-wrap">
              <span
                className="affordability-bar"
                style={{
                  width: `${Math.min(100, (item.maxPrincipal / (affordability[0]?.maxPrincipal || 1)) * 100)}%`,
                  background: item.color,
                }}
              />
            </span>
            <span className="affordability-amount">
              up to {formatCurrency(item.maxPrincipal)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
