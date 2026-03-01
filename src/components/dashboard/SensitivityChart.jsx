import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { calculateAllOptions } from '../../engine/financingCalculator';
import { FINANCING_TYPES } from '../../data/financingTypes';
import { formatCurrency } from '../../utils/formatters';

// Products whose cost actually varies with interest rates (not factor-rate based)
const RATE_SENSITIVE = ['sba', 'lineOfCredit', 'equipmentFinancing', 'termLoan', 'creditCard'];

const DELTAS = [-3, -2, -1, 0, 1, 2, 3]; // % change from current prime

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const sign = Number(label) >= 0 ? '+' : '';
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 4,
        padding: '8px 12px',
        fontSize: 11,
        color: '#111827',
        lineHeight: 1.7,
        minWidth: 180,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 4, color: '#6b7280' }}>
        Prime Rate {sign}{label}%
      </div>
      {[...payload]
        .sort((a, b) => a.value - b.value)
        .map((p) => (
          <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
            <span style={{ color: p.color, fontWeight: 600 }}>{p.name}</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(p.value)}</span>
          </div>
        ))}
    </div>
  );
}

export function SensitivityChart({ inputs, liveRates }) {
  const [hoveredLine, setHoveredLine] = useState(null);

  const { chartData, maxCost } = useMemo(() => {
    const base = liveRates?.prime?.value ?? 7.5;

    const data = DELTAS.map((delta) => {
      const adjustedRates = {
        ...liveRates,
        prime: { value: base + delta },
        creditCard: liveRates?.creditCard, // CC rate is separate survey, not prime-linked
      };
      const results = calculateAllOptions(inputs, adjustedRates);
      const row = { delta };
      for (const r of results) {
        if (RATE_SENSITIVE.includes(r.id)) {
          row[r.id] = Math.round(r.totalCost);
        }
      }
      return row;
    });

    const allCosts = data.flatMap((d) => RATE_SENSITIVE.map((id) => d[id]).filter(Boolean));
    return { chartData: data, maxCost: Math.max(...allCosts) };
  }, [inputs, liveRates]);

  return (
    <div className="sensitivity-chart">
      <div className="section-header">
        <span className="section-title">Rate Sensitivity</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
          How total cost changes if prime rate moves ±3%
        </span>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 10, right: 16, bottom: 4, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <ReferenceLine x={0} stroke="#e5e7eb" strokeDasharray="4 3" strokeWidth={1.5} />
          <XAxis
            dataKey="delta"
            tickFormatter={(v) => `${v >= 0 ? '+' : ''}${v}%`}
            tick={{ fill: '#9ca3af', fontSize: 10, fontFamily: 'var(--font-mono)' }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickLine={false}
          />
          <YAxis
            domain={[0, maxCost * 1.05]}
            tickFormatter={(v) => {
              if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
              if (v >= 1000) return `$${(v / 1000).toFixed(0)}k`;
              return `$${v}`;
            }}
            tick={{ fill: '#9ca3af', fontSize: 10, fontFamily: 'var(--font-mono)' }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickLine={false}
            width={46}
          />
          <Tooltip content={<CustomTooltip />} />
          {RATE_SENSITIVE.map((id) => {
            const ft = FINANCING_TYPES[id];
            const isHovered = hoveredLine === id;
            return (
              <Line
                key={id}
                type="monotone"
                dataKey={id}
                name={ft.shortLabel}
                stroke={ft.color}
                strokeWidth={isHovered ? 2.5 : 1.5}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
                opacity={hoveredLine && !isHovered ? 0.25 : 1}
                onMouseEnter={() => setHoveredLine(id)}
                onMouseLeave={() => setHoveredLine(null)}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="sensitivity-legend">
        {RATE_SENSITIVE.map((id) => {
          const ft = FINANCING_TYPES[id];
          return (
            <span
              key={id}
              className={`sensitivity-legend-item${hoveredLine === id ? ' active' : ''}`}
              onMouseEnter={() => setHoveredLine(id)}
              onMouseLeave={() => setHoveredLine(null)}
            >
              <span className="sensitivity-legend-dot" style={{ background: ft.color }} />
              {ft.shortLabel}
            </span>
          );
        })}
      </div>
    </div>
  );
}
