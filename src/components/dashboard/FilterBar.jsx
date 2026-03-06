import { matchesFilter } from './filterUtils';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'fast', label: 'Fast (<1 wk)' },
  { id: 'lowCost', label: 'Low Cost' },
  { id: 'lowMonthly', label: 'Low Monthly' },
  { id: 'eligible', label: 'Eligible Only' },
];

export function FilterBar({ activeFilter, onFilterChange, results = [] }) {
  const total = results.length;

  const countFor = (filterId) => {
    if (!results.length || filterId === 'all') return total;
    return results.filter((r) => matchesFilter(r, filterId, results)).length;
  };

  const shownCount = activeFilter === 'all'
    ? total
    : results.filter((r) => r._matchesFilter !== false).length;

  return (
    <div className="filter-bar">
      {FILTERS.map((f) => (
        <button
          type="button"
          key={f.id}
          className={`filter-pill${activeFilter === f.id ? ' active' : ''}`}
          onClick={() => onFilterChange(activeFilter === f.id ? 'all' : f.id)}
          aria-pressed={activeFilter === f.id}
        >
          {f.label} {results.length > 0 ? `(${countFor(f.id)})` : ''}
        </button>
      ))}
      <span className="filter-bar-meta">
        Showing {shownCount} of {total}
      </span>
      {activeFilter !== 'all' && (
        <button
          type="button"
          className="filter-clear-btn"
          onClick={() => onFilterChange('all')}
          title="Clear active filter"
        >
          Clear
        </button>
      )}
    </div>
  );
}
