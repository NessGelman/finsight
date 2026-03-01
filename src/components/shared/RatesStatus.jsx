const STATUS_LABELS = {
  loading:  'Loading live rates…',
  live:     'Live rates',
  cached:   'Cached rates',
  fallback: 'Estimated rates',
};

function formatDate(dateStr) {
  if (!dateStr || dateStr === 'estimated') return null;
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function RatesStatus({ rates, status, compact }) {
  if (compact) {
    return (
      <div className="rates-status-compact">
        <span className={`rates-dot rates-dot--${status}`} />
        {rates?.prime?.value ? (
          <span className="rates-compact-text">
            Prime <strong>{rates.prime.value.toFixed(2)}%</strong>
            {rates?.creditCard?.value && ` · CC ${rates.creditCard.value.toFixed(1)}%`}
          </span>
        ) : (
          <span className="rates-compact-text">{STATUS_LABELS[status] ?? '—'}</span>
        )}
      </div>
    );
  }

  return (
    <div className="rates-status">
      <div className="rates-status-left">
        <span className={`rates-dot rates-dot--${status}`} />
        <span className="rates-status-label">{STATUS_LABELS[status]}</span>

        {rates?.prime?.value && (
          <span className="rates-chip">
            Fed Prime: <strong>{rates.prime.value.toFixed(2)}%</strong>
            {formatDate(rates.prime.date) && (
              <span className="rates-chip-date"> as of {formatDate(rates.prime.date)}</span>
            )}
          </span>
        )}

        {rates?.creditCard?.value && (
          <span className="rates-chip">
            Avg CC Rate: <strong>{rates.creditCard.value.toFixed(1)}%</strong>
            {formatDate(rates.creditCard.date) && (
              <span className="rates-chip-date"> as of {formatDate(rates.creditCard.date)}</span>
            )}
          </span>
        )}
      </div>

      <div className="rates-sources">
        <span className="rates-sources-label">Sources:</span>
        <a
          href="https://fred.stlouisfed.org/series/PRIME"
          target="_blank"
          rel="noopener noreferrer"
          className="rates-source-link"
        >
          Fed Prime Rate (FRED/PRIME)
        </a>
        <span className="rates-sources-sep">·</span>
        <a
          href="https://fred.stlouisfed.org/series/TERMCBCCALLNS"
          target="_blank"
          rel="noopener noreferrer"
          className="rates-source-link"
        >
          Credit Card Survey (FRED/TERMCBCCALLNS)
        </a>
        <span className="rates-sources-sep">·</span>
        <span className="rates-sources-static">
          MCA &amp; factoring: IBISWorld industry estimates
        </span>
      </div>
    </div>
  );
}
