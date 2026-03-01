import { FINANCING_TYPES, FINANCING_ORDER } from '../../data/financingTypes';
import { SPEED } from '../../data/speedData';

const TIER_COLORS = {
  fast:   '#16a34a',
  medium: '#d97706',
  slow:   '#dc2626',
};

const MAX_DAYS = 60; // axis max

export function FundingTimeline({ results }) {
  // Use results order (sorted by total cost) if available, else fallback to FINANCING_ORDER
  const order = results
    ? [...results].sort((a, b) => a.totalCost - b.totalCost).map((r) => r.id)
    : FINANCING_ORDER;

  return (
    <div className="funding-timeline">
      <div className="section-header">
        <span className="section-title">Funding Timeline</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
          Days from application to cash in hand
        </span>
      </div>

      <div className="timeline-axis-labels">
        <span>Day 0</span>
        <span>1 week</span>
        <span>2 weeks</span>
        <span>1 month</span>
        <span>2 months</span>
      </div>

      <div className="timeline-rows">
        {order.map((id) => {
          const ft = FINANCING_TYPES[id];
          const speed = SPEED[id];
          if (!ft || !speed) return null;

          const [minDays, maxDays] = speed.daysRange;
          const left = (minDays / MAX_DAYS) * 100;
          const width = Math.max(((maxDays - minDays) / MAX_DAYS) * 100, 1.5);
          const color = TIER_COLORS[speed.tier] ?? '#6b7280';

          return (
            <div key={id} className="timeline-row">
              <div className="timeline-row-label">
                <span className="timeline-dot" style={{ background: ft.color }} />
                <span className="timeline-product">{ft.shortLabel}</span>
              </div>
              <div className="timeline-track">
                <div
                  className="timeline-bar"
                  style={{ left: `${left}%`, width: `${width}%`, background: color }}
                  title={`${speed.label}`}
                />
              </div>
              <div className="timeline-row-label-right">{speed.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
