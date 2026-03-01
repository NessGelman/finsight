import { useEffect, useRef, useState } from 'react';
import { useSort } from '../../hooks/useSort';
import { Tooltip } from '../shared/Tooltip';
import { TOOLTIPS } from '../../data/tooltipContent';
import { SPEED } from '../../data/speedData';
import { formatCurrency, formatPercent, formatMonths } from '../../utils/formatters';

const COLUMNS = [
  { key: 'rank',            label: '#',           sortable: false },
  { key: 'label',           label: 'Option',      sortable: false },
  { key: 'totalCost',       label: 'Total Cost',  sortable: true,  tooltip: TOOLTIPS.totalCost },
  { key: 'sac',             label: 'SAC',          sortable: true,  tooltip: TOOLTIPS.sac },
  { key: 'monthlyPayment',  label: 'Monthly',      sortable: true,  tooltip: TOOLTIPS.avgMonthly },
  { key: 'freeCashflowPct', label: 'FCF %',        sortable: true,  tooltip: TOOLTIPS.freeCashflowPct },
  { key: 'termMonths',      label: 'Term',         sortable: true },
  { key: 'speed',           label: 'Speed',        sortable: false },
  { key: 'eligibility',     label: 'Elig.',        sortable: false },
];

function sacCellClass(sac) {
  if (sac < 15) return 'sac-cell sac-cell-low';
  if (sac < 40) return 'sac-cell sac-cell-mid';
  return 'sac-cell sac-cell-high';
}

function isHardBlocked(row) {
  return row.eligibilityWarnings?.some((w) => /requires?/i.test(w));
}

export function ComparisonTable({ results, selectedProduct, onSelectProduct }) {
  const { sorted, sortKey, sortDir, onSort } = useSort(results, 'totalCost', 'asc');
  const [popoverId, setPopoverId] = useState(null);
  const tableRef = useRef(null);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!tableRef.current?.contains(event.target)) {
        setPopoverId(null);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') setPopoverId(null);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (!sorted || sorted.length === 0) return null;

  function togglePopover(id, e) {
    e.stopPropagation();
    setPopoverId(popoverId === id ? null : id);
  }

  return (
    <div className="comparison-table-section" ref={tableRef}>
      <div className="section-header">
        <span className="section-title">All Options</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
          Click headers to sort
        </span>
      </div>

      <table className="comparison-table">
        <thead>
          <tr>
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                className={col.sortable ? 'sortable' : ''}
                data-active={sortKey === col.key}
                onClick={() => col.sortable && onSort(col.key)}
              >
                {col.label}
                {col.tooltip && <Tooltip content={col.tooltip} />}
                {col.sortable && sortKey === col.key && (
                  <span className="sort-indicator">{sortDir === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, idx) => {
            const isSelected = selectedProduct === row.id;
            const isDimmed = row._matchesFilter === false;

            return (
              <tr
                key={`${row.id}-${Math.round(row.totalCost)}`}
                className={
                  (row.isCheapest ? 'row-best ' : '') +
                  (isSelected ? 'row-selected ' : '') +
                  (isDimmed ? 'row-dimmed ' : '')
                }
                onClick={() => onSelectProduct?.(isSelected ? null : row.id)}
                onKeyDown={(e) => {
                  if (!onSelectProduct) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectProduct(isSelected ? null : row.id);
                  }
                }}
                style={{ cursor: onSelectProduct ? 'pointer' : undefined }}
                tabIndex={onSelectProduct ? 0 : undefined}
                role={onSelectProduct ? 'button' : undefined}
                aria-pressed={onSelectProduct ? isSelected : undefined}
              >
                {/* Rank */}
                <td>
                  <span className="option-rank">{idx + 1}</span>
                </td>

                {/* Option name */}
                <td style={{ boxShadow: `inset 3px 0 0 ${isDimmed ? '#d1d5db' : row.color}` }}>
                  <div className="option-cell">
                    <span className="option-name">{row.label}</span>
                    {row.isCheapest && <span className="option-badge-best">Best</span>}
                  </div>
                </td>

                {/* Total Cost */}
                <td>{formatCurrency(row.totalCost)}</td>

                {/* SAC — heat map cell */}
                <td>
                  <span className={sacCellClass(row.sac)}>
                    {formatPercent(row.sac)}
                  </span>
                </td>

                {/* Monthly */}
                <td>{formatCurrency(row.monthlyPayment)}</td>

                {/* FCF % */}
                <td>{formatPercent(row.freeCashflowPct)}</td>

                {/* Term */}
                <td style={{ color: 'var(--text-secondary)' }}>{formatMonths(row.termMonths)}</td>

                {/* Speed */}
                <td>
                  <span className="speed-cell">{SPEED[row.id]?.label ?? '—'}</span>
                </td>

                {/* Eligibility — with popover */}
                <td style={{ position: 'relative' }}>
                  {row.eligibilityWarnings?.length ? (
                    <>
                      <button
                        className={`eligibility-btn ${isHardBlocked(row) ? 'eligibility-warn' : 'eligibility-warn'}`}
                        onClick={(e) => togglePopover(row.id, e)}
                        title="Click to see details"
                      >
                        ⚠
                      </button>
                      {popoverId === row.id && (
                        <div className="eligibility-popover">
                          <div className="eligibility-popover-title">Eligibility Warnings</div>
                          <ul className="eligibility-popover-list">
                            {row.eligibilityWarnings.map((w, i) => (
                              <li key={i}>{w}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="eligibility-ok">✓</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
