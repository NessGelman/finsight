import { useEffect, useRef, useState, useMemo } from 'react';
import { useSort } from '../../hooks/useSort';
import { Tooltip } from '../shared/Tooltip';
import { TOOLTIPS } from '../../data/tooltipContent';
import { SPEED } from '../../data/speedData';
import { formatCurrency, formatPercent, formatMonths } from '../../utils/formatters';

const COLUMNS = [
  { key: 'rank', label: '#', sortable: false },
  { key: 'label', label: 'Option', sortable: false },
  { key: 'likelihood', label: 'Likelihood', sortable: true },
  { key: 'totalCost', label: 'Total Cost', sortable: true, tooltip: TOOLTIPS.totalCost },
  { key: 'sac', label: 'SAC', sortable: true, tooltip: TOOLTIPS.sac },
  { key: 'eac', label: 'EAC', sortable: true, tooltip: TOOLTIPS.eac },
  { key: 'monthlyPayment', label: 'Monthly', sortable: true, tooltip: TOOLTIPS.avgMonthly },
  { key: 'freeCashflowPct', label: 'FCF %', sortable: true, tooltip: TOOLTIPS.freeCashflowPct },
  { key: 'termMonths', label: 'Term', sortable: true },
  { key: 'speedOrder', label: 'Speed', sortable: true },
  { key: 'eligibility', label: 'Elig.', sortable: false },
];

function sacCellClass(sac) {
  if (sac < 15) return 'sac-cell sac-cell-low';
  if (sac < 40) return 'sac-cell sac-cell-mid';
  return 'sac-cell sac-cell-high';
}

function getLikelihoodClass(val) {
  if (val >= 80) return 'likelihood-pill likelihood--high';
  if (val >= 50) return 'likelihood-pill likelihood--med';
  return 'likelihood-pill likelihood--low';
}

function getLikelihoodLabel(val) {
  if (val >= 80) return 'High';
  if (val >= 50) return 'Medium';
  return 'Low';
}

export function ComparisonTable({ results, savedResults, selectedProduct, onSelectProduct, strategy, onShowSchedule }) {
  // Determine initial sort key based on strategy
  const initialKey = useMemo(() => {
    if (strategy === 'speed') return 'speedOrder';
    if (strategy === 'cost') return 'totalCost';
    if (strategy === 'cashflow') return 'monthlyPayment';
    return 'totalCost';
  }, [strategy]);

  const { sorted, sortKey, sortDir, onSort, setSort } = useSort(results, initialKey, 'asc');
  const [popoverId, setPopoverId] = useState(null);
  const tableRef = useRef(null);

  // Strategy presets should enforce ascending sort for their primary metric.
  useEffect(() => {
    if (strategy === 'cost' && (sortKey !== 'totalCost' || sortDir !== 'asc')) {
      setSort('totalCost', 'asc');
    } else if (strategy === 'cashflow' && (sortKey !== 'monthlyPayment' || sortDir !== 'asc')) {
      setSort('monthlyPayment', 'asc');
    } else if (strategy === 'speed' && (sortKey !== 'speedOrder' || sortDir !== 'asc')) {
      setSort('speedOrder', 'asc');
    }
  }, [strategy, sortKey, sortDir, setSort]);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!tableRef.current?.contains(event.target)) {
        setPopoverId(null);
      }
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  if (!sorted || sorted.length === 0) return null;

  return (
    <div className="comparison-table-section" ref={tableRef}>
      <div className="section-header">
        <span className="section-title">All Options</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Click headers to sort</span>
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
            const savedRow = savedResults?.find(s => s.id === row.id);
            const costDelta = savedRow ? row.totalCost - savedRow.totalCost : null;

            return (
              <tr
                key={`${row.id}-${Math.round(row.totalCost)}`}
                className={
                  (row.isCheapest ? 'row-best ' : '') +
                  (isSelected ? 'row-selected ' : '') +
                  (isDimmed ? 'row-dimmed ' : '')
                }
                onClick={() => onSelectProduct?.(isSelected ? null : row.id)}
                style={{ cursor: onSelectProduct ? 'pointer' : undefined }}
              >
                <td><span className="option-rank">{idx + 1}</span></td>
                <td style={{ boxShadow: `inset 3px 0 0 ${isDimmed ? '#d1d5db' : row.color}` }}>
                  <div className="option-cell" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="option-name">{row.label}</span>
                      {row.isCheapest && <span className="option-badge-best">Best</span>}
                    </div>
                    <button
                      className="top-bar-btn"
                      style={{ fontSize: '9px', padding: '1px 5px', height: '18px', visibility: isSelected ? 'visible' : 'hidden' }}
                      onClick={(e) => { e.stopPropagation(); onShowSchedule?.(row); }}
                    >
                      Schedule
                    </button>
                  </div>
                </td>
                <td><span className={getLikelihoodClass(row.likelihood)}>{getLikelihoodLabel(row.likelihood)}</span></td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>{formatCurrency(row.totalCost)}</span>
                    {costDelta !== null && costDelta !== 0 && (
                      <span style={{ fontSize: '9px', color: costDelta > 0 ? 'var(--accent-red)' : 'var(--accent-green)', fontWeight: 'bold' }}>
                        {costDelta > 0 ? '+' : ''}{formatCurrency(costDelta)} vs stored
                      </span>
                    )}
                  </div>
                </td>
                <td><span className={sacCellClass(row.sac)}>{formatPercent(row.sac)}</span></td>
                <td><span className={sacCellClass(row.eac ?? row.sac)}>{formatPercent(row.eac ?? row.sac)}</span></td>
                <td>{formatCurrency(row.monthlyPayment)}</td>
                <td>{formatPercent(row.freeCashflowPct)}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{formatMonths(row.termMonths)}</td>
                <td><span className="speed-cell">{SPEED[row.id]?.label ?? '—'}</span></td>
                <td style={{ position: 'relative' }}>
                  {row.eligibilityWarnings?.length ? (
                    <>
                      <button
                        className="eligibility-btn eligibility-warn"
                        onClick={(e) => { e.stopPropagation(); setPopoverId(popoverId === row.id ? null : row.id); }}
                      >⚠</button>
                      {popoverId === row.id && (
                        <div className="eligibility-popover">
                          <div className="eligibility-popover-title">Eligibility Warnings</div>
                          <ul className="eligibility-popover-list">
                            {row.eligibilityWarnings.map((w, i) => (<li key={i}>{w}</li>))}
                          </ul>
                        </div>
                      )}
                    </>
                  ) : (<span className="eligibility-ok">✓</span>)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
