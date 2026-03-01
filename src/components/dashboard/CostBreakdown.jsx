import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { formatCurrency } from '../../utils/formatters';

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderLeft: `3px solid ${d.color}`,
        borderRadius: 4,
        padding: '8px 12px',
        fontSize: 12,
        color: '#111827',
        lineHeight: 1.7,
        minWidth: 180,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{d.label}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
        <span style={{ color: '#9ca3af' }}>Principal</span>
        <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          {formatCurrency(d.principal)}
        </strong>
      </div>
      {d.interest > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ color: '#3b82f6' }}>Interest</span>
          <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            {formatCurrency(d.interest)}
          </strong>
        </div>
      )}
      {d.fees > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ color: '#d97706' }}>Fees</span>
          <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            {formatCurrency(d.fees)}
          </strong>
        </div>
      )}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 16,
          borderTop: '1px solid #f3f4f6',
          marginTop: 4,
          paddingTop: 4,
        }}
      >
        <span style={{ fontWeight: 600 }}>Total</span>
        <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          {formatCurrency(d.total)}
        </strong>
      </div>
    </div>
  );
}

export function CostBreakdown({ results }) {
  const chartData = useMemo(() => {
    if (!results || results.length === 0) return [];

    return [...results]
      .sort((a, b) => a.totalCost - b.totalCost)
      .map((r) => {
        const principal = r.totalCost - (r.interestAmount || 0) - (r.feeAmount || 0);

        return {
          id: r.id,
          label: r.label,
          shortLabel: r.shortLabel,
          color: r.color,
          principal: Math.max(0, principal),
          interest: r.interestAmount || 0,
          fees: r.feeAmount || 0,
          total: r.totalCost,
        };
      });
  }, [results]);

  if (chartData.length === 0) return null;

  return (
    <div className="cost-breakdown">
      <div className="section-header">
        <span className="section-title">Cost Breakdown</span>
        <div className="cost-breakdown-legend">
          <span className="legend-item">
            <span className="legend-swatch" style={{ background: '#d1d5db' }} />
            Principal
          </span>
          <span className="legend-item">
            <span className="legend-swatch" style={{ background: '#3b82f6' }} />
            Interest
          </span>
          <span className="legend-item">
            <span className="legend-swatch" style={{ background: '#d97706' }} />
            Fees
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={chartData.length * 36 + 20}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 16, bottom: 4, left: 4 }}
          barSize={18}
        >
          <XAxis
            type="number"
            tickFormatter={(val) => {
              if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
              if (val >= 1000) return `$${(val / 1000).toFixed(0)}k`;
              return `$${val}`;
            }}
            tick={{ fill: '#9ca3af', fontSize: 10, fontFamily: 'var(--font-mono)' }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="shortLabel"
            tick={{ fill: '#6b7280', fontSize: 11, fontFamily: 'var(--font-sans)', fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
            width={50}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
          <Bar dataKey="principal" stackId="cost" fill="#d1d5db" radius={[0, 0, 0, 0]} />
          <Bar dataKey="interest" stackId="cost" fill="#3b82f6" radius={[0, 0, 0, 0]} />
          <Bar dataKey="fees" stackId="cost" fill="#d97706" radius={[0, 2, 2, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
